import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  Platform,
  Dimensions
} from 'react-native';
import * as ImageManipulator from 'react-native-image-manipulator';
import { request, PERMISSIONS } from 'react-native-permissions';
import ImageEditor from './ImageEditor';
import * as MediaLibrary from 'react-native-media-library';

const { width } = Dimensions.get('window');

const PERMISSION =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.PHOTO_LIBRARY
    : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

const styles = {
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black'
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  capture: {
    flex: 0,
    backgroundColor: 'black',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20
  }
};

const IMAGE_EDITOR_SIZE = width;

export default class ImageManipulatorSample extends React.Component {
  state = {
    crop: {},
    croppedImage: null,
    image: null
  };

  componentDidMount() {
    request(PERMISSION);

    this.getPhoto();
  }

  getPhoto = async () => {
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 1000
    });

    this.setState({
      image: assets[assets.length - 1],
      ratio: assets[0].width / assets[0].height
    });
  };

  onChange = crop => {
    const [scale, originX, originY] = crop;
    this.crop = { scale, originX, originY };
    console.log('crop', this.crop);
  };

  handleCrop = async () => {
    const { image } = this.state;
    //(960 / 1.33 - 350 * 1.33) / 2,
    // const originX =
    // (image.width / this.state.ratio - IMAGE_EDITOR_SIZE * this.state.ratio) /
    // 2;

    const crop = {
      originY: 0,
      originX: 0,
      // originX: (-(this.crop.originX - 46.875) * 3) / this.crop.scale,
      width: (image.height * this.state.ratio) / this.crop.scale,
      height: (image.height * this.state.ratio) / this.crop.scale
    };

    const data = await ImageManipulator.manipulateAsync(image.uri, [{ crop }]);

    this.setState({ croppedImage: data });
  };

  renderImage = () => {
    return this.state.croppedImage ? (
      <Image
        source={this.state.croppedImage}
        style={{
          width: IMAGE_EDITOR_SIZE,
          height: IMAGE_EDITOR_SIZE
        }}
        resizeMode="contain"
      />
    ) : (
      <ImageEditor
        onChange={this.onChange}
        source={this.state.image}
        ratio={this.state.ratio}
        minZoom={this.state.ratio}
      />
    );
  };

  render() {
    if (!this.state.image) {
      return null;
    }

    return (
      <View style={{ flex: 1, marginTop: 200 }}>
        <View
          style={{
            width: IMAGE_EDITOR_SIZE,
            height: IMAGE_EDITOR_SIZE
          }}
        >
          {this.renderImage()}
        </View>

        <View
          style={{ flex: 0, flexDirection: 'row', justifyContent: 'center' }}
        >
          {this.state.image && (
            <TouchableOpacity onPress={this.handleCrop} style={styles.capture}>
              <Text style={{ fontSize: 16, color: 'white' }}>Crop image</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
}
