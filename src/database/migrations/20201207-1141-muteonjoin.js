module.exports = {
  up: (queryInterface, Sequelize) => {
    const addMuteOnJoinColumn = () => queryInterface.addColumn('RoomSessions', 'muteOnJoin', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
    const updateAllRoomsToNotMuteOnJoin = () => queryInterface.bulkUpdate('RoomSessions', { muteOnJoin: false }, {});
    const makeMuteOnJoinNonNullable = () => queryInterface.changeColumn('RoomSessions', 'muteOnJoin', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      default: false,
    });

    return Promise.resolve()
      .then(addMuteOnJoinColumn)
      .then(updateAllRoomsToNotMuteOnJoin)
      .then(makeMuteOnJoinNonNullable);
  },
  down: (queryInterface) => {
    const removeMuteOnJoinColumn = () => queryInterface.removeColumn('RoomSessions', 'muteOnJoin');

    return Promise.resolve()
      .then(removeMuteOnJoinColumn);
  }
}