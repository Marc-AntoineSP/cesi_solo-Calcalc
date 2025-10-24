export default class NotFoundError extends Error {
  private statusCode:number;

  constructor(resource:string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}
