OTLayout = (layoutContainer, screenContainer, options) => {
  const config = Object.assign({
    aspectRatio: 16 / 9, // Aspect Ratio
    highlight: true,
  }, options);

  const fixedLayoutDimensions = [
    { width: '100%', height: '100%' },  // 0 speakers, 1x1
    { width: '100%', height: '100%' },  // 1 speakers, 1x1
    { width: '50%', height: '100%' },  // 2 speakers, 2x1
    { width: '50%', height: '50%' },  // 3 speakers, 3x1
    { width: '50%', height: '50%' },  // 4 speakers, 2x2
    { width: '33.333%', height: '50%' },  // 5 speakers, 3x2
    { width: '33.333%', height: '50%' },  // 6 speakers, 3x2
    { width: '25%', height: '50%' },  // 7 speakers, 4x2
    { width: '25%', height: '50%' },  // 8 speakers, 4x2
    { width: '33.333%', height: '33.333%' },  // 9 speakers, 3x3
    { width: '25%', height: '33.333%' },  // 10 speakers, 4x3
    { width: '25%', height: '33.333%' },  // 11 speakers, 4x3
    { width: '25%', height: '33.333%' },  // 12 speakers, 4x3
    { width: '25%', height: '25%' },  // 13 speakers, 4x4
    { width: '25%', height: '25%' },  // 14 speakers, 4x4
    { width: '25%', height: '25%' },  // 15 speakers, 4x4
    { width: '25%', height: '25%' },  // 16 speakers, 4x4
    { width: '20%', height: '25%' },  // 17 speakers, 5x4
    { width: '20%', height: '25%' },  // 18 speakers, 5x4
    { width: '20%', height: '25%' },  // 19 speakers, 5x4
    { width: '20%', height: '25%' },  // 20 speakers, 5x4
  ];

  const border = '10px solid #C53994';
  const emptyBorder = '10px solid transparent';
  const selfSpeakerIds = [];

  const layoutContainerElement = layoutContainer;
  layoutContainerElement.style.display = 'flex';
  layoutContainerElement.style['flex-direction'] = 'row';
  layoutContainerElement.style['flex-wrap'] = 'wrap';
  layoutContainerElement.style['justify-content'] = 'center';
  layoutContainerElement.style['align-items'] = 'center';

  const screenContainerElement = screenContainer;
  screenContainerElement.style.display = 'flex';
  screenContainerElement.style['flex-direction'] = 'row';
  screenContainerElement.style['flex-wrap'] = 'wrap';
  screenContainerElement.style['justify-content'] = 'center';
  screenContainerElement.style['align-items'] = 'center';

  let mostActiveSpeakerId = null;


  const getFixedLayoutDimension = (numberOfStreams) => fixedLayoutDimensions[numberOfStreams];

  const getDynamicLayoutDimensions = (numberOfStreams, isScreen = false) => {
    const w = window.outerWidth;
    const h = window.outerHeight;
    const isPortrait = h > w;

    const hasScreens = screenContainerElement.childNodes.length > 0;
    if (hasScreens && !isScreen) {
      if (isPortrait) {
        const height = 100;
        const width = height * config.aspectRatio;
        return {
          width,
          height,
        };
      } else {
        const width = 200;
        const height = width / config.aspectRatio;
        return {
          width,
          height,
        };
      }
    }

    const containerElement = isScreen ? screenContainerElement : layoutContainerElement;
    const { width: containerWidth, height: containerHeight } = containerElement.getBoundingClientRect();
    const containerArea = containerWidth * containerHeight;
    //console.log(`${isScreen ? 'screen' : 'layout'} container: ${containerWidth} x ${containerHeight}`);

    const bestDimension = {
      efficiency: 0,
      width: 0,
      height: 0,
    };

    for (let row = 1; row <= numberOfStreams; row += 1) {
      for (let column = 1; column <= numberOfStreams; column += 1) {
        if (row * column < numberOfStreams) {
          continue;
        }

        const elementWidth = containerWidth / column;
        const elementHeight = containerHeight / row;
        const elementAspectRatio = elementWidth / elementHeight;

        let resizedWidth = elementWidth;
        let resizedHeight = elementHeight;
        if (config.aspectRatio < elementAspectRatio) {
          // Fit Height
          resizedWidth = config.aspectRatio * elementHeight;
        } else {
          // Fit Width
          resizedHeight = elementWidth / config.aspectRatio;
        }

        const resizedArea = resizedWidth * resizedHeight;
        const totalArea = resizedArea * numberOfStreams;
        const efficiency = totalArea / containerArea;

        if (efficiency > bestDimension.efficiency) {
          bestDimension.efficiency = efficiency;
          bestDimension.width = resizedWidth;
          bestDimension.height = resizedHeight;
        }
      }
    }

    return {
      width: bestDimension.width,
      height: bestDimension.height,
    };
  };

  const adjustHighlight = () => {
    const childNodes = layoutContainerElement.childNodes;
    for (let i = 0; i < childNodes.length; i += 1) {
      const childNode = childNodes[i];

      // Remove border from everyone
      childNode.style.border = emptyBorder;

      // Ignore border if there's only 2 child nodes
      if (childNodes.length <= 2) {
        continue;
      }

      // Add border to most active speaker
      if (config.highlight && childNode.id === mostActiveSpeakerId) {
        childNode.style.border = border;
      }
    }
  }

  const enableHighlight = (enabled) => {
    config.highlight = enabled;
    adjustHighlight();
  }

  const updateHighlight = (speakerId) => {
    mostActiveSpeakerId = speakerId;
    adjustHighlight();
  }

  const adjustLayout = (positions, numberOfActiveSpeakers = 2) => {
    const w = window.outerWidth;
    const h = window.outerHeight;
    const isPortrait = h > w;
    console.log(`${w} x ${h} [${isPortrait ? 'Portrait' : 'Landscape'}]`);


    const parentElement = layoutContainerElement.parentNode;
    const numberOfScreens = screenContainerElement.childNodes.length;
    const hasScreens = numberOfScreens > 0;

    if (isPortrait) {
      // Set Parent container
      parentElement.style['flex-direction'] = 'column';
      parentElement.style.width = '100%';
      parentElement.style.height = null;
      parentElement.classList.remove('fillAvailableHeight');

      // Set width of containers
      screenContainerElement.style.display = hasScreens ? 'flex' : 'none';
      screenContainerElement.style.width = '100%';
      screenContainerElement.style.height = null;
      screenContainerElement.classList.remove('fillAvailableHeight');

      layoutContainerElement.style.height = hasScreens ? '200px' : '100%';
      layoutContainerElement.style.width = '100%';
      layoutContainerElement.style['flex-direction'] = 'row';
      layoutContainerElement.style['flex-wrap'] = hasScreens ? null : 'wrap';
      layoutContainerElement.style['overflow-x'] = hasScreens ? 'scroll' : null;
      layoutContainerElement.classList.remove('fillAvailableHeight');
    } else {
      // Set Parent container
      parentElement.style['flex-direction'] = 'row';
      parentElement.style.width = null;
      parentElement.classList.add('fillAvailableHeight');

      // Set width of containers
      screenContainerElement.style.display = hasScreens ? 'flex' : 'none';
      screenContainerElement.style.width = '0px';
      screenContainerElement.classList.add('fillAvailableHeight');

      layoutContainerElement.style.width = hasScreens ? '200px' : '100%';
      layoutContainerElement.style['flex-direction'] = hasScreens ? 'column' : 'row';
      layoutContainerElement.style['flex-wrap'] = hasScreens ? null : 'wrap';
      layoutContainerElement.style['overflow-y'] = hasScreens ? 'scroll' : null;
      layoutContainerElement.classList.add('fillAvailableHeight');
    }

    // Update Screen Dimensions
    const screenDimension = getDynamicLayoutDimensions(numberOfScreens, true);
    const screenNodes = screenContainerElement.childNodes;
    for (let i = 0; i < screenNodes.length; i += 1) {
      screenNodes[i].style.display = 'flex';
      screenNodes[i].style.width = `${screenDimension.width}px`;
      screenNodes[i].style.height = `${screenDimension.height}px`;
      
    }

    // Hide All
    const children = [];
    const childNodes = layoutContainerElement.childNodes;
    for (let i = 0; i < childNodes.length; i += 1) {
      const childNode = childNodes[i];
      childNode.setAttribute('style', 'display: none;');
      childNode.style.display = 'none';
      childNode.style.border = null;

      children.push({ id: childNode.id, node: childNode, filled: false });
    }

    // Fill children into position
    const positionedChildren = [];
    const combinedSpeakerPositions = [...selfSpeakerIds, ...positions];
    const numberOfStreams = Math.min(numberOfActiveSpeakers, combinedSpeakerPositions.length);
    const layoutDimension = getDynamicLayoutDimensions(numberOfStreams, false);

    for (let i = 0; i < numberOfStreams; i += 1) {
      const speakerId = combinedSpeakerPositions[i];
      for (let j = 0; j < children.length; j += 1) {
        if (children[j].id === speakerId) {
          // Update Style
          children[j].node.setAttribute('style', `display: flex; width: ${layoutDimension.width}; height: ${layoutDimension.height}`);
          children[j].node.style.display = 'flex';

          // Fill into position
          positionedChildren.push(children[j]);

          // Mark as filled
          children[j].filled = true;
          break;
        }
      }
    }

    // Fill remaining children
    const remainingChildren = children.filter(child => !child.filled);
    for (let i = 0; i < remainingChildren.length; i += 1) {
      positionedChildren.push(remainingChildren[i]);
    }

    // Add back to layout container
    layoutContainerElement.innerHTML = '';
    for (let i = 0; i < positionedChildren.length; i += 1) {
      layoutContainerElement.appendChild(positionedChildren[i].node);
    }

    // Adjust Highlight
    adjustHighlight();
  };

  const addSelfSpeakerId = (speakerId) => {
    const index = selfSpeakerIds.indexOf(speakerId);
    if (index === -1) {
      selfSpeakerIds.push(speakerId);
      selfSpeakerIds.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
    }
  };

  const removeSelfSpeakerId = (speakerId) => {
    const index = selfSpeakerIds.indexOf(speakerId);
    if (index >= 0) {
      selfSpeakerIds.splice(index, 1);
      selfSpeakerIds.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
    }
  };

  return {
    adjustLayout,
    updateHighlight,
    enableHighlight,

    addSelfSpeakerId,
    removeSelfSpeakerId,
  };
};
