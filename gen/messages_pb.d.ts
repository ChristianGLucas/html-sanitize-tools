// package: christiangeorgelucas.html_sanitize_tools
// file: messages.proto

import * as jspb from "google-protobuf";

export class RemovedItem extends jspb.Message {
  getKind(): string;
  setKind(value: string): void;

  getTag(): string;
  setTag(value: string): void;

  getAttribute(): string;
  setAttribute(value: string): void;

  getValue(): string;
  setValue(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RemovedItem.AsObject;
  static toObject(includeInstance: boolean, msg: RemovedItem): RemovedItem.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RemovedItem, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RemovedItem;
  static deserializeBinaryFromReader(message: RemovedItem, reader: jspb.BinaryReader): RemovedItem;
}

export namespace RemovedItem {
  export type AsObject = {
    kind: string,
    tag: string,
    attribute: string,
    value: string,
  }
}

export class Report extends jspb.Message {
  clearRemovedList(): void;
  getRemovedList(): Array<RemovedItem>;
  setRemovedList(value: Array<RemovedItem>): void;
  addRemoved(value?: RemovedItem, index?: number): RemovedItem;

  getRemovedCount(): number;
  setRemovedCount(value: number): void;

  getWasModified(): boolean;
  setWasModified(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Report.AsObject;
  static toObject(includeInstance: boolean, msg: Report): Report.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Report, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Report;
  static deserializeBinaryFromReader(message: Report, reader: jspb.BinaryReader): Report;
}

export namespace Report {
  export type AsObject = {
    removedList: Array<RemovedItem.AsObject>,
    removedCount: number,
    wasModified: boolean,
  }
}

export class SanitizeQuery extends jspb.Message {
  getHtml(): string;
  setHtml(value: string): void;

  clearAllowedTagsList(): void;
  getAllowedTagsList(): Array<string>;
  setAllowedTagsList(value: Array<string>): void;
  addAllowedTags(value: string, index?: number): string;

  clearAllowedAttributesList(): void;
  getAllowedAttributesList(): Array<string>;
  setAllowedAttributesList(value: Array<string>): void;
  addAllowedAttributes(value: string, index?: number): string;

  getAllowSvg(): boolean;
  setAllowSvg(value: boolean): void;

  getAllowMathMl(): boolean;
  setAllowMathMl(value: boolean): void;

  clearAllowedUriSchemesList(): void;
  getAllowedUriSchemesList(): Array<string>;
  setAllowedUriSchemesList(value: Array<string>): void;
  addAllowedUriSchemes(value: string, index?: number): string;

  getAllowDataAttributes(): boolean;
  setAllowDataAttributes(value: boolean): void;

  clearForbidTagsList(): void;
  getForbidTagsList(): Array<string>;
  setForbidTagsList(value: Array<string>): void;
  addForbidTags(value: string, index?: number): string;

  clearForbidAttributesList(): void;
  getForbidAttributesList(): Array<string>;
  setForbidAttributesList(value: Array<string>): void;
  addForbidAttributes(value: string, index?: number): string;

  getWholeDocument(): boolean;
  setWholeDocument(value: boolean): void;

  getStripContentOfRemovedTags(): boolean;
  setStripContentOfRemovedTags(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SanitizeQuery.AsObject;
  static toObject(includeInstance: boolean, msg: SanitizeQuery): SanitizeQuery.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SanitizeQuery, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SanitizeQuery;
  static deserializeBinaryFromReader(message: SanitizeQuery, reader: jspb.BinaryReader): SanitizeQuery;
}

export namespace SanitizeQuery {
  export type AsObject = {
    html: string,
    allowedTagsList: Array<string>,
    allowedAttributesList: Array<string>,
    allowSvg: boolean,
    allowMathMl: boolean,
    allowedUriSchemesList: Array<string>,
    allowDataAttributes: boolean,
    forbidTagsList: Array<string>,
    forbidAttributesList: Array<string>,
    wholeDocument: boolean,
    stripContentOfRemovedTags: boolean,
  }
}

export class SanitizeResult extends jspb.Message {
  getHtml(): string;
  setHtml(value: string): void;

  hasReport(): boolean;
  clearReport(): void;
  getReport(): Report | undefined;
  setReport(value?: Report): void;

  getError(): string;
  setError(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SanitizeResult.AsObject;
  static toObject(includeInstance: boolean, msg: SanitizeResult): SanitizeResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SanitizeResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SanitizeResult;
  static deserializeBinaryFromReader(message: SanitizeResult, reader: jspb.BinaryReader): SanitizeResult;
}

export namespace SanitizeResult {
  export type AsObject = {
    html: string,
    report?: Report.AsObject,
    error: string,
  }
}

export class AuditQuery extends jspb.Message {
  getHtml(): string;
  setHtml(value: string): void;

  clearAllowedTagsList(): void;
  getAllowedTagsList(): Array<string>;
  setAllowedTagsList(value: Array<string>): void;
  addAllowedTags(value: string, index?: number): string;

  clearAllowedAttributesList(): void;
  getAllowedAttributesList(): Array<string>;
  setAllowedAttributesList(value: Array<string>): void;
  addAllowedAttributes(value: string, index?: number): string;

  getAllowSvg(): boolean;
  setAllowSvg(value: boolean): void;

  getAllowMathMl(): boolean;
  setAllowMathMl(value: boolean): void;

  clearAllowedUriSchemesList(): void;
  getAllowedUriSchemesList(): Array<string>;
  setAllowedUriSchemesList(value: Array<string>): void;
  addAllowedUriSchemes(value: string, index?: number): string;

  getAllowDataAttributes(): boolean;
  setAllowDataAttributes(value: boolean): void;

  clearForbidTagsList(): void;
  getForbidTagsList(): Array<string>;
  setForbidTagsList(value: Array<string>): void;
  addForbidTags(value: string, index?: number): string;

  clearForbidAttributesList(): void;
  getForbidAttributesList(): Array<string>;
  setForbidAttributesList(value: Array<string>): void;
  addForbidAttributes(value: string, index?: number): string;

  getWholeDocument(): boolean;
  setWholeDocument(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AuditQuery.AsObject;
  static toObject(includeInstance: boolean, msg: AuditQuery): AuditQuery.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AuditQuery, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AuditQuery;
  static deserializeBinaryFromReader(message: AuditQuery, reader: jspb.BinaryReader): AuditQuery;
}

export namespace AuditQuery {
  export type AsObject = {
    html: string,
    allowedTagsList: Array<string>,
    allowedAttributesList: Array<string>,
    allowSvg: boolean,
    allowMathMl: boolean,
    allowedUriSchemesList: Array<string>,
    allowDataAttributes: boolean,
    forbidTagsList: Array<string>,
    forbidAttributesList: Array<string>,
    wholeDocument: boolean,
  }
}

export class AuditResult extends jspb.Message {
  getSafe(): boolean;
  setSafe(value: boolean): void;

  hasReport(): boolean;
  clearReport(): void;
  getReport(): Report | undefined;
  setReport(value?: Report): void;

  getError(): string;
  setError(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AuditResult.AsObject;
  static toObject(includeInstance: boolean, msg: AuditResult): AuditResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AuditResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AuditResult;
  static deserializeBinaryFromReader(message: AuditResult, reader: jspb.BinaryReader): AuditResult;
}

export namespace AuditResult {
  export type AsObject = {
    safe: boolean,
    report?: Report.AsObject,
    error: string,
  }
}

export class AttributeQuery extends jspb.Message {
  getTag(): string;
  setTag(value: string): void;

  getAttribute(): string;
  setAttribute(value: string): void;

  getValue(): string;
  setValue(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AttributeQuery.AsObject;
  static toObject(includeInstance: boolean, msg: AttributeQuery): AttributeQuery.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AttributeQuery, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AttributeQuery;
  static deserializeBinaryFromReader(message: AttributeQuery, reader: jspb.BinaryReader): AttributeQuery;
}

export namespace AttributeQuery {
  export type AsObject = {
    tag: string,
    attribute: string,
    value: string,
  }
}

export class AttributeResult extends jspb.Message {
  getValid(): boolean;
  setValid(value: boolean): void;

  getError(): string;
  setError(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AttributeResult.AsObject;
  static toObject(includeInstance: boolean, msg: AttributeResult): AttributeResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AttributeResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AttributeResult;
  static deserializeBinaryFromReader(message: AttributeResult, reader: jspb.BinaryReader): AttributeResult;
}

export namespace AttributeResult {
  export type AsObject = {
    valid: boolean,
    error: string,
  }
}

