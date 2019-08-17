import { NativeModules } from 'react-native';
import {
  Action,
  ImageResult,
  SaveFormat,
  SaveOptions
} from './ImageManipulator.types';

const { ImageManipulator } = NativeModules;

export async function manipulateAsync(
  uri: string,
  actions: Action[] = [],
  { format = SaveFormat.JPEG, ...rest }: SaveOptions = {}
): Promise<ImageResult> {
  if (!ImageManipulator.manipulateAsync) {
    throw new Error('ImageManipulator not available');
  }
  if (!(typeof uri === 'string')) {
    throw new TypeError('The "uri" argument must be a string');
  }
  return await ImageManipulator.manipulateAsync(uri, actions, {
    format,
    ...rest
  });
}

export * from './ImageManipulator.types';
