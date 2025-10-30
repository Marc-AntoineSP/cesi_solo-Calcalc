export default class QueryError extends Error {
  private statusCode;

  constructor(message:string) {
    super(message);
    this.statusCode = 500;
    this.name = 'QueryError';
  }
}
