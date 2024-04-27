// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {data} from '../models';

export function ClearSetting(arg1:string):Promise<void>;

export function GetFilePath():Promise<string>;

export function GetSetting(arg1:string):Promise<any>;

export function Load(arg1:string):Promise<data.StaxieFileV1>;

export function OpenFileBytes(arg1:string):Promise<Array<number>>;

export function ReadBytes(arg1:string):Promise<Array<number>>;

export function Save(arg1:string,arg2:data.StaxieFileV1):Promise<void>;

export function SaveFileBytes(arg1:string,arg2:Array<number>):Promise<void>;

export function SaveFilePath(arg1:string):Promise<string>;

export function SetSetting(arg1:string,arg2:string):Promise<void>;

export function ToggleFullscreen():Promise<void>;

export function Version():Promise<string>;
