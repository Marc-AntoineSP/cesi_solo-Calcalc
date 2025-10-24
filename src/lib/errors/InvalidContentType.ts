export default class InvalidContentType extends Error {
  private statusCode:number;

  constructor() {
    super('Wrong request data');
    this.name = 'InvalidContentTypeError';
    this.statusCode = 405;
  }
}
