import React from 'react';
import { Button, View, Image } from 'react-native';
import * as ImageManipulator from 'react-native-image-manipulator';

export default class ImageManipulatorSample extends React.Component {
  state = {
    ready: false,
    image: null
  };

  componentDidMount() {
    this.setState({
      ready: true,
      image: Image.resolveAssetSource(require('./assets/cat.jpg'))
    });
  }

  render() {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {this.state.ready && this._renderImage()}
        <Button title="Rotate and Flip" onPress={this._rotate90andFlip} />
      </View>
    );
  }

  _rotate90andFlip = async () => {
    const image = await ImageManipulator.manipulateAsync(
      this.state.image,
      [
        { rotate: 90 },
        {
          flip: ImageManipulator.FlipType.Vertical
        }
      ],
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
}
