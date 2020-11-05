OTLayout = (layoutContainer, options) => {
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

  let mostActiveSpeakerId = null;


  const getFixedLayoutDimension = (numberOfStreams) => fixedLayoutDimensions[numberOfStreams];

  const getDynamicLayoutDimensions = (numberOfStreams) => {
    const { width: containerWidth, height: containerHeight } = layoutContainerElement.getBoundingClientRect();
    const containerArea = containerWidth * containerHeight;

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

    console.log(positions.length);
    console.log(selfSpeakerIds.length);
    console.log(combinedSpeakerPositions.length);
    console.log(numberOfActiveSpeakers);
    console.log('=============================');

    const numberOfStreams = Math.min(numberOfActiveSpeakers, combinedSpeakerPositions.length);
    const layoutDimension = getDynamicLayoutDimensions(numberOfStreams);

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
