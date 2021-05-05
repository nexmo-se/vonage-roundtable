module.exports = {
  up: (queryInterface, Sequelize) => {
    const addMuteOnJoinColumn = () => queryInterface.addColumn('RoomSessions', 'whiteboardOnJoin', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    return Promise.resolve()
      .then(addMuteOnJoinColumn);
  },
  down: (queryInterface) => {
    const removeMuteOnJoinColumn = () => queryInterface.removeColumn('RoomSessions', 'whiteboardOnJoin');

    return Promise.resolve()
      .then(removeMuteOnJoinColumn);
  }
}