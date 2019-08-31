package com.reactnativeimagemanipulator;

import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.net.Uri;
import android.util.Base64;

import com.facebook.common.executors.CallerThreadExecutor;
import com.facebook.common.executors.UiThreadImmediateExecutorService;
import com.facebook.common.references.CloseableReference;
import com.facebook.datasource.DataSource;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.common.RotationOptions;
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber;
import com.facebook.imagepipeline.image.CloseableImage;
import com.facebook.imagepipeline.request.ImageRequest;
import com.facebook.imagepipeline.request.ImageRequestBuilder;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.UUID;

public class ImageManipulatorModule extends ReactContextBaseJavaModule {
  private static final String DECODE_ERROR_TAG = "E_DECODE_ERR";
  private static final String ARGS_ERROR_TAG = "E_ARGS_ERR";

  public ImageManipulatorModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "ImageManipulator";
  }

  @ReactMethod
  public void manipulateAsync(final String uriString, final ReadableArray actions, final ReadableMap saveOptions, final Promise promise) {
    if (uriString == null || uriString.length() == 0) {
      promise.reject(ARGS_ERROR_TAG, "Uri passed to ImageManipulator cannot be empty!");
      return;
    }
    ImageRequest imageRequest =
        ImageRequestBuilder
            .newBuilderWithSource(Uri.parse(uriString))
            .setRotationOptions(RotationOptions.autoRotate())
            .build();
    final DataSource<CloseableReference<CloseableImage>> dataSource
        = Fresco.getImagePipeline().fetchDecodedImage(imageRequest, getReactApplicationContext());
    dataSource.subscribe(new BaseBitmapDataSubscriber() {
                           @Override
                           public void onNewResultImpl(Bitmap bitmap) {
                             if (bitmap != null) {
                               processBitmapWithActions(bitmap, actions, saveOptions, promise);
                             } else {
                               onFailureImpl(dataSource);
                             }
                           }

                           @Override
                           public void onFailureImpl(DataSource dataSource) {
                             // No cleanup required here.
                             String basicMessage = "Could not get decoded bitmap of " + uriString;
                             if (dataSource.getFailureCause() != null) {
                               promise.reject(DECODE_ERROR_TAG,
                                   basicMessage + ": " + dataSource.getFailureCause().toString(), dataSource.getFailureCause());
                             } else {
                               promise.reject(DECODE_ERROR_TAG, basicMessage + ".");
                             }
                           }
                         },
        CallerThreadExecutor.getInstance()
    );
  }

  private void processBitmapWithActions(Bitmap bmp, ReadableArray actions, ReadableMap saveOptions, Promise promise) {
    int imageWidth, imageHeight;

    for (int idx = 0; idx < actions.size(); idx ++) {
      ReadableMap options = actions.getMap(idx);

      imageWidth = bmp.getWidth();
      imageHeight = bmp.getHeight();

      if (options.hasKey("resize")) {
        ReadableMap resize = options.getMap("resize");
        int requestedWidth = 0;
        int requestedHeight = 0;
        float imageRatio = 1.0f * imageWidth / imageHeight;

        if (resize.hasKey("width")) {
          requestedWidth = (int) resize.getDouble("width");
          requestedHeight = (int) (requestedWidth / imageRatio);
        }
        if (resize.hasKey("height")) {
          requestedHeight = (int) resize.getDouble("height");
          requestedWidth = requestedWidth == 0 ? (int) (imageRatio * requestedHeight) : requestedWidth;
        }

        bmp = Bitmap.createScaledBitmap(bmp, requestedWidth, requestedHeight, true);
      } else if (options.hasKey("rotate")) {
        int requestedRotation = options.getInt("rotate");
        Matrix rotationMatrix = new Matrix();
        rotationMatrix.postRotate(requestedRotation);
        bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.getWidth(), bmp.getHeight(), rotationMatrix, true);
      } else if (options.hasKey("flip")) {
        Matrix rotationMatrix = new Matrix();
        ReadableMap flip = options.getMap("flip");
        if (flip.hasKey("horizontal") && flip.getBoolean("horizontal")) {
          rotationMatrix.postScale(-1, 1);
        }
        if (flip.hasKey("vertical") && flip.getBoolean("vertical")) {
          rotationMatrix.postScale(1, -1);
        }
        bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.getWidth(), bmp.getHeight(), rotationMatrix, true);
      } else if (options.hasKey("crop")) {
        ReadableMap crop = options.getMap("crop");
        // if (!crop.hasKey("originX") || !crop.hasKey("originY") || !crop.hasKey("width") || !crop.hasKey("height")) {
        //   promise.reject("E_INVALID_CROP_DATA", "Invalid crop options has been passed. Please make sure the object contains originX, originY, width and height.");
        //   return;
        // }
        int originX, originY, requestedWidth, requestedHeight;
        originX = (int) crop.getDouble("originX");
        originY = (int) crop.getDouble("originY");
        requestedWidth = (int) crop.getDouble("width");
        requestedHeight = (int) crop.getDouble("height");
        // if (originX > imageWidth || originY > imageHeight || requestedWidth > bmp.getWidth() || requestedHeight > bmp.getHeight()) {
        //   promise.reject("E_INVALID_CROP_DATA", "Invalid crop options has been passed. Please make sure the requested crop rectangle is inside source image.");
        //   return;
        // }
        bmp = Bitmap.createBitmap(bmp, originX, originY, requestedWidth, requestedHeight);
      }
    }

    int compressionQuality = 100;
    if (saveOptions.hasKey("compress")) {
      compressionQuality = (int) (100 * saveOptions.getDouble("compress"));
    }
    String format, extension;
    Bitmap.CompressFormat compressFormat;

    if (saveOptions.hasKey("format")) {
      format = saveOptions.getString("format");
    } else {
      format = "jpeg";
    }

    if (format.equals("png")) {
      compressFormat = Bitmap.CompressFormat.PNG;
      extension = ".png";
    } else if (format.equals("jpeg")) {
      compressFormat = Bitmap.CompressFormat.JPEG;
      extension = ".jpg";
    } else {
      compressFormat = Bitmap.CompressFormat.JPEG;
      extension = ".jpg";
    }

    boolean base64 = saveOptions.hasKey("base64") && saveOptions.getBoolean("base64");

    FileOutputStream out = null;
    ByteArrayOutputStream byteOut = null;
    String path = null;
    String base64String = null;
    try {
      path = this.getReactApplicationContext().getFilesDir() + "/" + UUID.randomUUID() + extension;
      out = new FileOutputStream(path);
      bmp.compress(compressFormat, compressionQuality, out);

      if (base64) {
        byteOut = new ByteArrayOutputStream();
        bmp.compress(compressFormat, compressionQuality, byteOut);
        base64String = Base64.encodeToString(byteOut.toByteArray(), Base64.DEFAULT);
      }
    } catch (Exception e) {
      e.printStackTrace();
    } finally {
      try {
        if (out != null) {
          out.close();
        }
        if (byteOut != null) {
          byteOut.close();
        }
      } catch (IOException e) {
        e.printStackTrace();
      }
    }

    WritableMap response = Arguments.createMap();
    response.putString("uri", Uri.fromFile(new File(path)).toString());
    response.putInt("width", bmp.getWidth());
    response.putInt("height", bmp.getHeight());
    if (base64) {
      response.putString("base64", base64String);
    }
    promise.resolve(response);
  }
}






// package com.reactnativeimagemanipulator;

// import android.content.Context;
// import android.graphics.Bitmap;
// import android.graphics.Matrix;
// import android.net.Uri;
// import android.os.Bundle;
// import android.support.annotation.NonNull;
// import android.support.annotation.Nullable;
// import android.util.Base64;

// import java.io.ByteArrayOutputStream;
// import java.io.File;
// import java.io.FileOutputStream;
// import java.io.IOException;
// import java.util.ArrayList;

// import com.facebook.react.bridge.ReactContextBaseJavaModule;
// import com.facebook.react.bridge.ReactApplicationContext;
// import com.facebook.react.bridge.Promise;
// import com.facebook.react.bridge.ReadableArray;
// import com.facebook.react.bridge.ReadableMap;
// import com.facebook.react.bridge.ReactMethod;
// import com.reactnativeimagemanipulator.interfaces.ImageLoader;

// import com.reactnativeimagemanipulator.arguments.Action;
// import com.reactnativeimagemanipulator.arguments.ActionCrop;
// import com.reactnativeimagemanipulator.arguments.ActionFlip;
// import com.reactnativeimagemanipulator.arguments.ActionResize;
// import com.reactnativeimagemanipulator.arguments.SaveOptions;

// public class ImageManipulatorModule extends ReactContextBaseJavaModule {
//   private static final String TAG = "ImageManipulator";
//   private static final String ERROR_TAG = "E_IMAGE_MANIPULATOR";
//   private ImageLoader mImageLoader ;

//   public ImageManipulatorModule(ReactApplicationContext reactContext) {
//     super(reactContext);
//   }

//   @Override
//   public String getName() {
//     return TAG;
//   }

//   // @Override
//   // public void onCreate(ModuleRegistry moduleRegistry) {
//   //   mImageLoader = moduleRegistry.getModule(ImageLoader.class);
//   // }

//   @ReactMethod
//   public void manipulateAsync(final String uri, final ReadableArray actions, final ReadableMap saveOptions, final Promise promise) {
//     if (uri == null || uri.length() == 0) {
//       promise.reject(ERROR_TAG + "_INVALID_ARG", "Uri passed to ImageManipulator cannot be empty!");
//       return;
//     }

//     final SaveOptions manipulatorSaveOptions;
//     final ArrayList<Action> manipulatorActions = new ArrayList<>();
//     try {
//       manipulatorSaveOptions = SaveOptions.fromArguments(saveOptions);
//        for (Object action : actions.toArrayList()) {
//          manipulatorActions.add(Action.fromObject(action));
//        }
//     } catch (IllegalArgumentException e) {
//       promise.reject(ERROR_TAG + "_INVALID_ARG", e);
//       return;
//     }

//     final ImageLoader.ResultListener callback = new ImageLoader.ResultListener() {
//       @Override
//       public void onSuccess(@NonNull Bitmap bitmap) {
//         processBitmapWithActions(bitmap, manipulatorActions, manipulatorSaveOptions, promise);
//       }

//       @Override
//       public void onFailure(@Nullable Throwable cause) {
//         // No cleanup required here.
//         String basicMessage = "Could not get decoded bitmap of " + uri;
//         if (cause != null) {
//           promise.reject(ERROR_TAG + "_DECODE",
//                   basicMessage + ": " + cause.toString(), cause);
//         } else {
//           promise.reject(ERROR_TAG + "_DECODE", basicMessage + ".");
//         }
//       }
//     };

//     mImageLoader.loadImageForManipulationFromURL(uri, callback);
//   }

//   private Bitmap resizeBitmap(Bitmap bitmap, ActionResize resize) {
//     float imageRatio = (float) bitmap.getWidth() / bitmap.getHeight();
//     int requestedWidth = resize.getWidth() != 0
//         ? resize.getWidth()
//         : resize.getHeight() != 0
//           ? (int) (resize.getHeight() * imageRatio)
//           : 0;
//     int requestedHeight = resize.getHeight() != 0
//         ? resize.getHeight()
//         : resize.getWidth() != 0
//           ? (int) (resize.getWidth() / imageRatio)
//           : 0;
//     return Bitmap.createScaledBitmap(bitmap, requestedWidth, requestedHeight, true);
//   }

//   private Bitmap rotateBitmap(Bitmap bitmap, Integer rotation) {
//     Matrix rotationMatrix = new Matrix();
//     rotationMatrix.postRotate(rotation);
//     return Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), rotationMatrix, true);
//   }

//   private Bitmap flipBitmap(Bitmap bmp, ActionFlip flip) {
//     return Bitmap.createBitmap(bmp, 0, 0, bmp.getWidth(), bmp.getHeight(), flip.getRotationMatrix(), true);
//   }

//   private Bitmap cropBitmap(Bitmap bitmap, ActionCrop crop) throws IllegalArgumentException {
//     if (crop.getOriginX() > bitmap.getWidth()
//         || crop.getOriginX() > bitmap.getHeight()
//         || crop.getOriginX() + crop.getWidth() > bitmap.getWidth()
//         || crop.getOriginY() + crop.getHeight() > bitmap.getHeight()
//     ) {
//       throw new IllegalArgumentException("Invalid crop options has been passed. Please make sure the requested crop rectangle is inside source image.");
//     }
//     return Bitmap.createBitmap(bitmap, crop.getOriginX(), crop.getOriginY(), crop.getWidth(), crop.getHeight());
//   }

//   private void processBitmapWithActions(Bitmap bitmap, final ArrayList<Action> actions, final SaveOptions saveOptions, Promise promise) {
//     for (Action action : actions) {
//       if (action.getResize() != null) {
//         bitmap = resizeBitmap(bitmap, action.getResize());
//       } else if (action.getRotate() != null) {
//         bitmap = rotateBitmap(bitmap, action.getRotate());
//       } else if (action.getFlip() != null) {
//         bitmap = flipBitmap(bitmap, action.getFlip());
//       } else if (action.getCrop() != null) {
//         try {
//           bitmap = cropBitmap(bitmap, action.getCrop());
//         } catch (IllegalArgumentException e) {
//           promise.reject(ERROR_TAG + "_CROP_DATA", e);
//           return;
//         }
//       }
//     }

//     int compression = (int) (saveOptions.getCompress() * 100);

//     FileOutputStream out = null;
//     ByteArrayOutputStream byteOut = null;
//     String path = null;
//     String base64String = null;
//     try {
//       path = FileUtils.generateOutputPath(this.getReactApplicationContext().getCacheDir(), "ImageManipulator", saveOptions.getFormat().getFileExtension());
//       out = new FileOutputStream(path);
//       bitmap.compress(saveOptions.getFormat().getCompressFormat(), compression, out);

//       if (saveOptions.hasBase64()) {
//         byteOut = new ByteArrayOutputStream();
//         bitmap.compress(saveOptions.getFormat().getCompressFormat(), compression, byteOut);
//         base64String = Base64.encodeToString(byteOut.toByteArray(), Base64.DEFAULT);
//       }
//     } catch (Exception e) {
//       e.printStackTrace();
//     } finally {
//       try {
//         if (out != null) {
//           out.close();
//         }
//         if (byteOut != null) {
//           byteOut.close();
//         }
//       } catch (IOException e) {
//         e.printStackTrace();
//       }
//     }

//     Bundle response = new Bundle();
//     response.putString("uri", Uri.fromFile(new File(path)).toString());
//     response.putInt("width", bitmap.getWidth());
//     response.putInt("height", bitmap.getHeight());
//     if (saveOptions.hasBase64()) {
//       response.putString("base64", base64String);
//     }
//     promise.resolve(response);
//   }
// }