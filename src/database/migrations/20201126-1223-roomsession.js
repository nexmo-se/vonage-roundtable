module.exports = {
  up: (queryInterface, Sequelize) => {
    const createRoomSessionsTable = () => queryInterface.createTable('RoomSessions', {
      id: {
        type: Sequelize.STRING(45),
        allowNull: false,
        primaryKey: true,
      },
      room: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      sessionId: {
        type: Sequelize.STRING(5000),
        allowNull: false,
      },
      lastPing: {
        type: Sequelize.INTEGER,
        allowNull: Sequelize,
        default: 0,
      },
      deleted: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    return Promise.resolve()
      .then(createRoomSessionsTable);
  },
  down: (queryInterface) => {
    const dropRoomSessionsTable = () => queryInterface.dropTable('RoomSessions');
    return Promise.resolve()
      .then(dropRoomSessionsTable);
  },
};
