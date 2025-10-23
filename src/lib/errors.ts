export class NotFoundError extends Error {
    constructor(resource:string){
        super(`${resource} not found`);
        this.name = "NotFoundError";
        this.statusCode = 404;
    }
}

export class InvalidContentType extends Error {
    constructor(){
        super('Wrong request data');
        this.name = "InvalidContentTypeError";
        this.statusCode = 405;
    }
}