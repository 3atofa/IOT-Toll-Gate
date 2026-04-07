const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WantedPerson = sequelize.define(
    'WantedPerson',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      fullName: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      faceImagePath: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      faceLabel: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'wanted_persons',
      underscored: true,
    }
  );

  return WantedPerson;
};
