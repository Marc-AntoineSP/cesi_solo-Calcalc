export type Product = {
    id:number;
    name:string;
    description:string;
    calocent:number;
    country_id:number;
};

export type Country = {
    id:number;
    name:string;
    latitude:number;
    longitude:number;
    flag:string;
};

export type ProductPost = {
    name:string;
    description:string;
    calocent:number;
    country_id:number;
};

export type ProductPatch = {
    name:string,
    description:string,
    calocent:number,
};

export type Role = 'admin' | 'user';
