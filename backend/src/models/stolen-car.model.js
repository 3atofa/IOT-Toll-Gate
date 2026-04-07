const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StolenCar = sequelize.define(
    'StolenCar',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      plateNumber: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      plateNormalized: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      vehicleType: {
        type: DataTypes.STRING(64),
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
      tableName: 'stolen_cars',
      underscored: true,
    }
  );

  return StolenCar;
};
