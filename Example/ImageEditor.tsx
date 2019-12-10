import React, { RefObject } from 'react';
import { ImageURISource, Platform, View } from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler
} from 'react-native-gesture-handler';
import Animated, { Easing } from 'react-native-reanimated';
import Grid from './Grid';

const {
  set,
  cond,
  block,
  eq,
  call,
  not,
  min,
  add,
  and,
  Value,
  spring,
  lessOrEq,
  or,
  divide,
  greaterThan,
  sub,
  event,
  multiply,
  clockRunning,
  startClock,
  timing,
  stopClock,
  decay,
  Clock,
  lessThan
} = Animated;

type PickerProps = {
  source: ImageURISource;
  ratio: number;
  onChange?: (size: number[]) => any;
  minZoom: number;
  maxZoom: number;
};

class Cropper extends React.Component<PickerProps> {
  static defaultProps = {
    minZoom: 1,
    maxZoom: 3
  };

  private readonly transX: Animated.Adaptable<number>;
  private readonly transY: Animated.Adaptable<number>;
  private readonly ratio: Animated.Value<number>;
  private readonly opacity: Animated.Value<number>;
  private readonly focalX: Animated.Value<number>;
  private readonly focalY: Animated.Value<number>;
  private readonly scale: Animated.Adaptable<number>;
  private readonly scaleMovement: Animated.Value<number>;
  private readonly dragX: Animated.Value<number>;
  private readonly dragY: Animated.Value<number>;
  private readonly panState: Animated.Value<number>;
  private readonly tapState: Animated.Value<number>;
  private readonly pinchState: Animated.Value<number>;
  private readonly handlePan: any;
  private readonly handleTap: any;
  private readonly handleOnLayout: any;
  private readonly handlePinch: any;
  private readonly photoWidth: any;
  private readonly componentWidth: any;
  private readonly componentHeight: any;
  private readonly photoHeight: any;
  private readonly distanceFromLeft: any;
  private readonly distanceFromTop: any;
  private readonly velocityX: any;
  private readonly velocityY: any;
  private readonly wasDecayRun: any;
  private readonly gridClock: Animated.Clock;
  private readonly decayXClock: Animated.Clock;
  private readonly decayYClock: Animated.Clock;

  constructor(props: PickerProps) {
    super(props);
    this.dragX = new Value(0);
    this.dragY = new Value(0);
    this.decayXClock = new Clock();
    this.decayYClock = new Clock();
    this.focalX = new Value(0);
    this.focalY = new Value(0);
    this.panState = new Value(0);
    this.pinchState = new Value(0);
    this.scaleMovement = new Value(props.ratio);
    this.photoHeight = new Value(1);
    this.photoWidth = new Value(1);
    this.tapState = new Value(0);
    this.opacity = new Value(0);
    this.distanceFromLeft = new Value(0);
    this.distanceFromTop = new Value(0);
    this.componentWidth = new Value(100);
    this.componentHeight = new Value(100);
    this.gridClock = new Clock();
    this.velocityX = new Value(0);
    this.velocityY = new Value(0);

    this.handlePan = event([
      {
        nativeEvent: {
          velocityY: this.velocityY,
          velocityX: this.velocityX,
          translationX: this.dragX,
          translationY: this.dragY,
          state: this.panState
        }
      }
    ]);

    this.handleTap = event([
      {
        nativeEvent: {
          state: this.tapState
        }
      }
    ]);

    this.handleOnLayout = ({
      nativeEvent: {
        layout: { width, height }
      }
    }: {
      nativeEvent: {
        layout: {
          width: number;
          height: number;
        };
      };
    }) => {
      this.componentHeight.setValue(height);
      this.componentWidth.setValue(width);
    };

    this.handlePinch = event([
      {
        nativeEvent: {
          scale: this.scaleMovement,
          state: this.pinchState,
          focalX: this.focalX,
          focalY: this.focalY
        }
      }
    ]);

    this.ratio = new Value(this.props.ratio);

    this.photoHeight = min(
      this.componentHeight,
      divide(this.componentWidth, this.ratio)
    );

    this.photoWidth = min(
      this.componentWidth,
      multiply(this.componentHeight, this.ratio)
    );

    this.distanceFromLeft = divide(
      sub(
        this.componentWidth,
        min(this.componentWidth, multiply(this.componentHeight, this.ratio))
      ),
      2
    );

    this.distanceFromTop = divide(
      sub(
        this.componentHeight,
        min(this.componentHeight, divide(this.componentWidth, this.ratio))
      ),
      2
    );

    this.scale = Cropper.withBouncyLimits(
      Cropper.withPreservingMultiplicativeOffset(
        this.scaleMovement,
        this.pinchState,
        this.props.minZoom,
        this.props.maxZoom
      ),
      this.props.minZoom,
      this.props.maxZoom,
      this.pinchState
    );

    const isUnderSizedX = lessOrEq(
      this.scale,
      divide(this.componentWidth, this.photoWidth)
    );

    const isUnderSizedY = lessOrEq(
      this.scale,
      divide(this.componentHeight, this.photoHeight)
    );

    const lowX = cond(
      isUnderSizedX,
      0,
      sub(
        divide(this.componentWidth, this.scale, 2),
        divide(this.photoWidth, 2)
      )
    );

    const lowY = cond(
      isUnderSizedY,
      0,
      sub(
        divide(this.componentHeight, this.scale, 2),
        divide(this.photoHeight, 2)
      )
    );

    const upX = cond(
      isUnderSizedX,
      lowX,
      divide(sub(this.photoWidth, divide(this.componentWidth, this.scale)), 2)
    );

    const upY = cond(
      isUnderSizedY,
      0,
      divide(sub(this.photoHeight, divide(this.componentHeight, this.scale)), 2)
    );

    this.wasDecayRun = new Value(0);

    this.transX = Cropper.withBouncyLimits(
      Cropper.withDecaying(
        Cropper.withAddingFocalDisplacement(
          Cropper.withPreservingAdditiveOffset(
            this.dragX,
            this.panState,
            this.scale
          ),
          sub(0.5, divide(this.focalX, this.photoWidth)),
          this.scale,
          this.photoWidth
        ),
        this.panState,
        this.velocityX,
        this.wasDecayRun,
        this.scale,
        this.decayXClock
      ),
      lowX,
      upX,
      this.panState,
      this.pinchState
    );

    this.transY = Cropper.withBouncyLimits(
      Cropper.withDecaying(
        Cropper.withAddingFocalDisplacement(
          Cropper.withPreservingAdditiveOffset(
            this.dragY,
            this.panState,
            this.scale
          ),
          sub(0.5, divide(this.focalX, this.photoHeight)),
          this.scale,
          this.photoHeight
        ),
        this.panState,
        this.velocityY,
        this.wasDecayRun,
        this.scale,
        this.decayYClock
      ),
      lowY,
      upY,
      this.panState,
      this.pinchState
    );
  }

  private static withBouncyLimits(
    val: Animated.Adaptable<number>,
    minBound: Animated.Adaptable<number>,
    maxBound: Animated.Adaptable<number>,
    state: Animated.Adaptable<number>,
    anotherState?: Animated.Adaptable<number>
  ) {
    const prev = new Value(0);
    const limitedVal = new Value(0);
    const flagWasRunSpring = new Value(0);
    const springClock = new Clock();

    return block([
      cond(
        or(
          eq(state, State.BEGAN),
          anotherState
            ? and(eq(state, State.END), eq(anotherState, State.ACTIVE))
            : 0
        ),
        [set(prev, val), set(flagWasRunSpring, 0), stopClock(springClock)],
        [
          cond(
            eq(state, State.END),
            [
              cond(
                lessThan(limitedVal, minBound),
                set(
                  limitedVal,
                  Cropper.runSpring(
                    springClock,
                    limitedVal,
                    minBound,
                    flagWasRunSpring
                  )
                ),
                cond(
                  greaterThan(limitedVal, maxBound),
                  set(
                    limitedVal,
                    Cropper.runSpring(
                      springClock,
                      limitedVal,
                      maxBound,
                      flagWasRunSpring
                    )
                  ),
                  [
                    cond(
                      not(flagWasRunSpring),
                      set(limitedVal, add(limitedVal, sub(val, prev)))
                    ),
                    set(prev, val)
                  ]
                )
              )
            ],
            [
              set(limitedVal, add(limitedVal, sub(val, prev))),
              cond(and(lessThan(limitedVal, minBound), lessThan(val, prev)), [
                // revert a bit
                set(limitedVal, add(limitedVal, divide(sub(prev, val), 1.2)))
              ]),
              cond(
                and(greaterThan(limitedVal, maxBound), greaterThan(val, prev)),
                [
                  // revert a bit
                  set(limitedVal, add(limitedVal, divide(sub(prev, val), 1.2)))
                ]
              ),
              set(prev, val)
            ]
          )
        ]
      ),
      limitedVal
    ]);
  }

  private static runSpring(
    clock: Animated.Clock,
    value: Animated.Adaptable<number>,
    dest: Animated.Adaptable<number>,
    wasStartedFromBegin: Animated.Value<number>
  ) {
    const state = {
      finished: new Value(0),
      velocity: new Value(0),
      position: new Value(0),
      time: new Value(0)
    };

    const wasJustStarted = new Value(0);

    const config = {
      damping: 40,
      mass: 1,
      stiffness: 121.6,
      overshootClamping: true,
      restSpeedThreshold: 0.001,
      restDisplacementThreshold: 0.001,
      toValue: new Value(0)
    };

    return [
      set(wasJustStarted, 0),
      cond(or(clockRunning(clock), wasStartedFromBegin), 0, [
        set(state.finished, 0),
        set(state.position, value),
        set(config.toValue, dest),
        startClock(clock),
        set(wasJustStarted, 1)
      ]),
      cond(clockRunning(clock), spring(clock, state, config)),
      cond(state.finished, [
        cond(
          and(clockRunning(clock), not(wasJustStarted)),
          set(wasStartedFromBegin, 1)
        ),
        stopClock(clock)
      ]),
      state.position
    ];
  }

  private static runTiming(
    clock: Animated.Clock,
    value: Animated.Adaptable<number>,
    dest: Animated.Adaptable<number>
  ) {
    const state = {
      finished: new Value(0),
      position: new Value(0),
      frameTime: new Value(0),
      time: new Value(0)
    };

    const config = {
      toValue: new Value(0),
      duration: 300,
      easing: Easing.inOut(Easing.cubic)
    };

    return [
      cond(clockRunning(clock), 0, [
        set(state.finished, 0),
        set(state.frameTime, 0),
        set(state.time, 0),
        set(state.position, value),
        set(config.toValue, dest),
        startClock(clock)
      ]),
      timing(clock, state, config),
      cond(state.finished, stopClock(clock)),
      state.position
    ];
  }

  private static runDecay(
    clock: Animated.Clock,
    value: Animated.Adaptable<number>,
    velocity: Animated.Adaptable<number>,
    wasStartedFromBegin: Animated.Value<number>
  ): Animated.Adaptable<number> {
    const state = {
      finished: new Value(0),
      velocity: new Value(0),
      position: new Value(0),
      time: new Value(0)
    };

    const wasJustStarted = new Value(0);

    const config = { deceleration: 0.98 };

    return [
      set(wasJustStarted, 0),
      cond(or(clockRunning(clock), wasStartedFromBegin), 0, [
        set(state.finished, 0),
        set(state.velocity, velocity),
        set(state.position, value),
        set(state.time, 0),
        startClock(clock),
        set(wasJustStarted, 1)
      ]),
      cond(clockRunning(clock), decay(clock, state, config)),
      cond(
        and(clockRunning(clock), not(wasJustStarted)),
        set(wasStartedFromBegin, 1)
      ),
      cond(state.finished, [stopClock(clock)]),
      state.position
    ];
  }

  private static withDecaying(
    drag: Animated.Adaptable<number>,
    state: Animated.Adaptable<number>,
    velocity: Animated.Value<number>,
    wasStartedFromBegin: Animated.Value<number>,
    scale: Animated.Adaptable<number>,
    decayClock: Animated.Clock
  ): Animated.Adaptable<number> {
    const valDecayed = new Value(0);
    const offset = new Value(0);
    const prevState = new Value(0);

    return block([
      cond(
        eq(state, State.END),
        set(
          valDecayed,
          Cropper.runDecay(
            decayClock,
            add(drag, offset),
            divide(velocity, scale),
            wasStartedFromBegin
          )
        ),
        [
          stopClock(decayClock),
          cond(
            or(
              eq(state, State.BEGAN),
              and(eq(prevState, State.END), eq(state, State.ACTIVE))
            ),
            [set(wasStartedFromBegin, 0), set(offset, sub(valDecayed, drag))]
          ),
          set(prevState, state),
          set(valDecayed, add(drag, offset))
        ]
      ),
      valDecayed
    ]);
  }

  private static withPreservingAdditiveOffset(
    drag: Animated.Value<number>,
    state: Animated.Value<number>,
    scale: Animated.Adaptable<number>
  ): Animated.Adaptable<number> {
    const prev = new Value(0);
    const valWithPreservedOffset = new Value(0);

    return block([
      cond(eq(state, State.BEGAN), set(prev, 0), [
        set(
          valWithPreservedOffset,
          add(
            valWithPreservedOffset,
            Platform.select({
              ios: divide(sub(drag, prev), scale),
              android: divide(sub(drag, prev), scale)
            })
          )
        ),
        set(prev, drag)
      ]),
      valWithPreservedOffset
    ]);
  }

  private static withAddingFocalDisplacement(
    init: Animated.Adaptable<number>,
    diff: Animated.Adaptable<number>,
    scale: Animated.Adaptable<number>,
    size: Animated.Value<number>
  ): Animated.Adaptable<number> {
    const prevScale = new Value(1);
    const valWithFocalDisplacement = new Value(0);

    return block([
      set(
        valWithFocalDisplacement,
        add(
          valWithFocalDisplacement,
          divide(multiply(diff, sub(scale, prevScale), size), scale, scale)
        )
      ),
      set(prevScale, scale),
      add(init, valWithFocalDisplacement)
    ]);
  }

  private static withPreservingMultiplicativeOffset(
    val: Animated.Value<number>,
    state: Animated.Value<number>,
    min: Animated.Adaptable<number>,
    max: Animated.Adaptable<number>
  ): Animated.Adaptable<number> {
    if (Platform.OS === 'android') {
      return this.withPreservingMultiplicativeOffsetAndroid(
        val,
        state,
        min,
        max
      );
    }

    const offset = new Value(1);
    const valWithPreservedOffset = new Value(1);

    return block([
      cond(eq(state, State.BEGAN), [
        cond(
          greaterThan(valWithPreservedOffset, max),
          set(valWithPreservedOffset, max)
        ),
        cond(
          lessThan(valWithPreservedOffset, min),
          set(valWithPreservedOffset, min)
        ),
        set(offset, valWithPreservedOffset)
      ]),
      set(valWithPreservedOffset, multiply(offset, val)),
      valWithPreservedOffset
    ]);
  }

  private static withPreservingMultiplicativeOffsetAndroid(
    val: Animated.Value<number>,
    state: Animated.Value<number>,
    min: Animated.Adaptable<number>,
    max: Animated.Adaptable<number>
  ): Animated.Adaptable<number> {
    const offset = new Value(1);
    const init = new Value(0);
    const valWithPreservedOffset = new Value(1);

    return block([
      cond(
        eq(state, State.BEGAN),
        [
          cond(
            greaterThan(valWithPreservedOffset, max),
            set(valWithPreservedOffset, max)
          ),
          cond(
            lessThan(valWithPreservedOffset, min),
            set(valWithPreservedOffset, min)
          ),
          set(offset, valWithPreservedOffset),
          set(init, 0)
        ],
        [
          cond(eq(init, 0), set(init, val)),
          set(valWithPreservedOffset, multiply(offset, divide(val, init)))
        ]
      ),
      valWithPreservedOffset
    ]);
  }

  pinch: RefObject<PinchGestureHandler> = React.createRef();
  pan: RefObject<PanGestureHandler> = React.createRef();
  tap: RefObject<TapGestureHandler> = React.createRef();

  render() {
    return (
      <View
        style={{
          overflow: 'hidden',
          backgroundColor: 'black'
        }}
      >
        {this.props.onChange && (
          <Animated.Code
            exec={call(
              [this.scale, this.transX, this.transY],
              this.props.onChange
            )}
          />
        )}
        <PinchGestureHandler
          shouldCancelWhenOutside={false}
          ref={this.pinch}
          simultaneousHandlers={[this.pan, this.tap]}
          onGestureEvent={this.handlePinch}
          onHandlerStateChange={this.handlePinch}
        >
          <Animated.View>
            <PanGestureHandler
              ref={this.pan}
              simultaneousHandlers={[this.pinch, this.tap]}
              onGestureEvent={this.handlePan}
              onHandlerStateChange={this.handlePan}
            >
              <Animated.View>
                <TapGestureHandler
                  maxDurationMs={10000000}
                  ref={this.tap}
                  simultaneousHandlers={[this.pinch, this.pan]}
                  onHandlerStateChange={this.handleTap}
                >
                  <Animated.View>
                    <Animated.Image
                      onLayout={this.handleOnLayout}
                      resizeMode="contain"
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: [
                          { scale: this.scale },
                          { translateX: this.transX },
                          { translateY: this.transY }
                        ]
                      }}
                      source={this.props.source}
                    />
                    <Grid
                      opacity={block([
                        cond(
                          1,
                          cond(
                            or(
                              eq(this.tapState, State.BEGAN),
                              eq(this.tapState, State.ACTIVE)
                            ),
                            [
                              stopClock(this.decayYClock),
                              stopClock(this.decayXClock),
                              set(
                                this.opacity,
                                Cropper.runTiming(
                                  this.gridClock,
                                  this.opacity,
                                  1
                                )
                              )
                            ],
                            set(
                              this.opacity,
                              Cropper.runTiming(this.gridClock, this.opacity, 0)
                            )
                          )
                        ),
                        this.opacity
                      ])}
                    />
                  </Animated.View>
                </TapGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </View>
    );
  }
}

type WrapperState = {
  val: number;
};

export default class ImageEditorWrapper extends React.Component<
  PickerProps,
  WrapperState
> {
  state = {
    val: 0
  };

  static getDerivedStateFromProps(props: PickerProps, state: WrapperState) {
    return {
      val: state.val + 1
    };
  }

  render() {
    return <Cropper {...this.props} key={this.state.val} />;
  }
}
