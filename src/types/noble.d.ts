// Minimal type declarations for @stoprocent/noble (a maintained noble fork).
// Full types available via @types/noble if needed.

declare module '@stoprocent/noble' {
  import { EventEmitter } from 'events';

  interface Advertisement {
    localName?: string;
    manufacturerData?: Buffer;
    serviceUuids?: string[];
    serviceData?: Array<{ uuid: string; data: Buffer }>;
  }

  interface Characteristic extends EventEmitter {
    uuid: string;
    properties: string[];
    subscribe(callback: (error: Error | null) => void): void;
    unsubscribe(callback?: (error: Error | null) => void): void;
    write(data: Buffer, withoutResponse: boolean, callback: (error: Error | null) => void): void;
    read(callback: (error: Error | null, data: Buffer) => void): void;
    once(event: 'data', listener: (data: Buffer, isNotification: boolean) => void): this;
    on(event: 'data', listener: (data: Buffer, isNotification: boolean) => void): this;
  }

  interface Service extends EventEmitter {
    uuid: string;
    discoverCharacteristics(
      characteristicUuids: string[],
      callback: (error: Error | null, characteristics: Characteristic[]) => void,
    ): void;
  }

  interface Peripheral extends EventEmitter {
    uuid: string;
    advertisement: Advertisement;
    state: string;
    connect(callback: (error: Error | null) => void): void;
    disconnect(callback?: () => void): void;
    discoverServices(
      serviceUuids: string[],
      callback: (error: Error | null, services: Service[]) => void,
    ): void;
    once(event: 'disconnect', listener: () => void): this;
    on(event: 'disconnect', listener: () => void): this;
  }

  interface Noble extends EventEmitter {
    state: string;
    startScanning(serviceUuids: string[], allowDuplicates: boolean): void;
    stopScanning(): void;
    on(event: 'stateChange', listener: (state: string) => void): this;
    on(event: 'discover', listener: (peripheral: Peripheral) => void): this;
  }

  const noble: Noble;
  export default noble;
  export { Peripheral, Service, Characteristic, Advertisement };
}
