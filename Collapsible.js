import React, { Component } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const ANIMATED_EASING_PREFIXES = ['easeInOut', 'easeOut', 'easeIn'];

export default class Collapsible extends Component {
  static defaultProps = {
    align: 'top',
    collapsed: true,
    collapsedHeight: 0,
    enablePointerEvents: false,
    duration: 200,
    easing: Easing.out(Easing.cubic),
    onAnimationEnd: () => null,
    renderChildrenCollapsed: true,
  };

  constructor(props) {
    super(props);
    this.state = {
      measuring: false,
      measured: false,
      height: new Animated.Value(props.collapsedHeight),
      contentHeight: 0,
      animating: false,
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.collapsed !== this.props.collapsed) {
      this.setState({ measured: false }, () =>
        this._componentDidUpdate(prevProps)
      );
    } else {
      this._componentDidUpdate(prevProps);
    }
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  _componentDidUpdate(prevProps) {
    if (prevProps.collapsed !== this.props.collapsed) {
      this._toggleCollapsed(this.props.collapsed);
    } else if (
      this.props.collapsed &&
      prevProps.collapsedHeight !== this.props.collapsedHeight
    ) {
      this.state.height.setValue(this.props.collapsedHeight);
    }
  }

  contentHandle = null;

  _handleRef = (ref) => {
    this.contentHandle = ref;
  };

  _measureContent(callback) {
    this.setState(
      {
        measuring: true,
      },
      () => {
        requestAnimationFrame(() => {
          if (!this.contentHandle) {
            this.setState(
              {
                measuring: false,
              },
              () => callback(this.props.collapsedHeight)
            );
          } else {
            let ref;
            if (typeof this.contentHandle.measure === 'function') {
              ref = this.contentHandle;
            } else {
              ref = this.contentHandle.getNode();
            }
            ref.measure((x, y, width, height) => {
              this.setState(
                {
                  measuring: false,
                  measured: true,
                  contentHeight: height,
                },
                () => callback(height)
              );
            });
          }
        });
      }
    );
  }

  _toggleCollapsed(collapsed) {
    if (collapsed) {
      this._transitionToHeight(this.props.collapsedHeight);
    } else if (!this.contentHandle) {
      if (this.state.measured) {
        this._transitionToHeight(this.state.contentHeight);
      }
      return;
    } else {
      this._measureContent((contentHeight) => {
        this._transitionToHeight(contentHeight);
      });
    }
  }
  _transitionToHeight(height) {
    const { duration } = this.props;
    const easing = this._getEasingType(this.props.easing);

    if (this._animation) {
      this._animation.stop();
    }

    this.setState({ animating: true });
    this._animation = Animated.timing(this.state.height, {
      toValue: height,
      duration: duration,
      easing: easing,
      useNativeDriver: true,
    });

    this._animation.start(({ finished }) => {
      this.setState({ animating: false });
      if (finished) {
        this.props.onAnimationEnd();
      }
    });
  }

  _getEasingType(easing) {
    let prefix,
      found = false;
    for (let i = 0; i < ANIMATED_EASING_PREFIXES.length; i++) {
      prefix = ANIMATED_EASING_PREFIXES[i];
      if (easing.substr(0, prefix.length) === prefix) {
        easing =
          easing.substr(prefix.length, 1).toLowerCase() +
          easing.substr(prefix.length + 1);
        prefix = prefix.substr(4, 1).toLowerCase() + prefix.substr(5);
        return Animated[prefix](Animated[easing || 'ease']);
      }
    }

    return Animated[easing];
  }

  render() {
    const { height, animating } = this.state;
    const {
      children,
      collapsed,
      enablePointerEvents,
      renderChildrenCollapsed,
    } = this.props;
    const pointerEvents =
      collapsed && !animating && !renderChildrenCollapsed
        ? 'none'
        : enablePointerEvents
        ? 'box-none'
        : 'auto';

    return (
      <Animated.View
        style={[styles.container, { height }]}
        pointerEvents={pointerEvents}
      >
        <View
          style={styles.contentContainer}
          onLayout={this._handleOnLayout}
          ref={this._handleRef}
        >
          {children}
        </View>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
});
