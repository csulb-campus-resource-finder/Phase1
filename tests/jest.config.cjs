const config = {
  rootDir: '..',

  preset: 'ts-jest',
  testEnvironment: 'node',

  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: false
      }
    ]
  }
};

module.exports = config;