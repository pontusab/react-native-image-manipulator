#import "ImageUtils.h"

@implementation ImageUtils

+ (UIImage *)cropImage:(UIImage *)image toRect:(CGRect)rect
{
  CGImageRef takenCGImage = image.CGImage;
  CGImageRef cropCGImage = CGImageCreateWithImageInRect(takenCGImage, rect);
  image = [UIImage imageWithCGImage:cropCGImage scale:image.scale orientation:image.imageOrientation];
  CGImageRelease(cropCGImage);
  return image;
}

@end
