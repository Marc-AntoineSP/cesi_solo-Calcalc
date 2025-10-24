export default class InvalidContentType extends Error {
  constructor() {
    super('Wrong request data');
    this.name = 'InvalidContentTypeError';
    this.statusCode = 405;
  }
}
