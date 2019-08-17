import { NativeModules } from 'react-native';
import { SaveFormat } from './ImageManipulator.types';
const { ImageManipulator } = NativeModules;
export async function manipulateAsync(uri, actions = [], { format = SaveFormat.JPEG, ...rest } = {}) {
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
//# sourceMappingURL=ImageManipulator.js.map