import React from 'react';
import { Button, View, Image, TouchableOpacity, Text } from 'react-native';
import * as ImageManipulator from 'react-native-image-manipulator';
import { RNCamera } from 'react-native-camera';

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
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20
  }
};

export default class ImageManipulatorSample extends React.Component {
  state = {
    ready: false,
    image: null
  };

  componentDidMount() {
    this.setState({
      ready: true
    });
  }

  takePicture = async () => {
    if (this.camera) {
      const options = { quality: 0.5, base64: true };
      const data = await this.camera.takePictureAsync(options);
      this.setState({
        image: data
      });
    }
  };

  _rotate90andFlip = async () => {
    const image = await ImageManipulator.manipulateAsync(
      this.state.image.uri,
      [{ rotate: 90 }],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.PNG
      }
    );

    this.setState({ image });
  };

  _renderImage = () => {
    return (
      <View
        style={{
          marginVertical: 20,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Image
          source={this.state.image}
          style={{ width: 300, height: 300, resizeMode: 'contain' }}
        />
      </View>
    );
  };

  render() {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <RNCamera
          ref={ref => {
            this.camera = ref;
          }}
          style={styles.preview}
          type={RNCamera.Constants.Type.back}
          flashMode={RNCamera.Constants.FlashMode.on}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'Ok',
            buttonNegative: 'Cancel'
          }}
          androidRecordAudioPermissionOptions={{
            title: 'Permission to use audio recording',
            message: 'We need your permission to use your audio',
            buttonPositive: 'Ok',
            buttonNegative: 'Cancel'
          }}
          onGoogleVisionBarcodesDetected={({ barcodes }) => {
            console.log(barcodes);
          }}
        />
        <View
          style={{ flex: 0, flexDirection: 'row', justifyContent: 'center' }}
        >
          <TouchableOpacity
            onPress={this.takePicture.bind(this)}
            style={styles.capture}
          >
            <Text style={{ fontSize: 14 }}> SNAP </Text>
          </TouchableOpacity>
        </View>
        {this.state.ready && this._renderImage()}
        <Button title="Rotate and Flip" onPress={this._rotate90andFlip} />
      </View>
    );
  }
}
