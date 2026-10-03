declare module 'jsmediatags' {
  export function read(
    file: File | Blob | string,
    callbacks: {
      onSuccess: (tag: any) => void;
      onError: (error: any) => void;
    }
  ): void;

  const jsmediatags: {
    read: (
      file: File | Blob | string,
      callbacks: {
        onSuccess: (tag: any) => void;
        onError: (error: any) => void;
      }
    ) => void;
  };

  export default jsmediatags;
}
