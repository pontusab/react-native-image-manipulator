package com.reactnativeimagemanipulator.interfaces;

import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.os.AsyncTask;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import com.facebook.common.references.CloseableReference;
import com.facebook.datasource.DataSource;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.imagepipeline.core.ImagePipeline;
import com.facebook.imagepipeline.datasource.BaseBitmapDataSubscriber;
import com.facebook.imagepipeline.image.CloseableImage;
import com.facebook.imagepipeline.request.ImageRequest;
import com.facebook.react.bridge.ReactContext;

import static java.security.AccessController.getContext;

public class FrescoImageLoader implements ImageLoader {
    private ReactContext mReactContext;

    @Override
    public void loadImageForDisplayFromURL(@NonNull String url, final ResultListener resultListener) {
        ImageRequest imageRequest = ImageRequest.fromUri(url);

        ImagePipeline imagePipeline = Fresco.getImagePipeline();
        DataSource<CloseableReference<CloseableImage>> dataSource =
                imagePipeline.fetchDecodedImage(imageRequest, mReactContext);

        dataSource.subscribe(
                new BaseBitmapDataSubscriber() {
                    @Override
                    public void onNewResultImpl(@Nullable Bitmap bitmap) {
                        if (bitmap == null) {
                            resultListener.onFailure(new Exception("Loaded bitmap is null"));
                            return;
                        }
                        resultListener.onSuccess(bitmap);
                    }

                    @Override
                    public void onFailureImpl(DataSource dataSource) {
                        resultListener.onFailure(dataSource.getFailureCause());
                    }
                },
                AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @Override
    public void loadImageForManipulationFromURL(@NonNull String url, final ResultListener resultListener) {
/*
        Glide.with(getContext())
                .asBitmap()
                .diskCacheStrategy(DiskCacheStrategy.NONE)
                .skipMemoryCache(true)
                .load(url)
                .into(new SimpleTarget<Bitmap>() {
                    @Override
                    public void onResourceReady(@NonNull Bitmap resource, @Nullable Transition<? super Bitmap> transition) {
                        resultListener.onSuccess(resource);
                    }

                    @Override
                    public void onLoadFailed(@Nullable Drawable errorDrawable) {
                        resultListener.onFailure(new Exception("Loading bitmap failed"));
                    }
                });
*/
    }
}
