OTParticipation = (options) => {
  let currentParticipentId = null;
  let currentParticipantStartTime = 0;

  let onParticipationChangeListener = null;

  const participants = {};

  const setCurrentParticipant = (participantId) => {
    if (currentParticipentId && currentParticipantStartTime > 0) {
      // End current participant
      const currentParticipantEndTime = new Date().getTime();
      const duration = currentParticipantEndTime - currentParticipantStartTime;

      // Initialize current participant if not exist
      if (participants[currentParticipentId] == null) {
        participants[currentParticipentId] = 0;
      }

      // Update current participant
      participants[currentParticipentId] += duration;
    }

    // Start new participant
    currentParticipentId = participantId;
    currentParticipantStartTime = new Date().getTime();

    if (onParticipationChangeListener != null) {
      onParticipationChangeListener();
    }
  };

  const deleteParticipant = (participantId) => {
    delete participants[participantId];

    if (onParticipationChangeListener != null) {
      onParticipationChangeListener();
    }
  }

  const getParticipations = () => JSON.parse(JSON.stringify(participants));

  const setOnParticipationChangeListener = (listener) => {
    onParticipationChangeListener = listener;
  }

  return {
    setCurrentParticipant,
    getParticipations,
    deleteParticipant,

    setOnParticipationChangeListener,
  }
}
