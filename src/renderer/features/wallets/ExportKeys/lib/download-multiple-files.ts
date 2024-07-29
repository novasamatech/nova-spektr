type FileForDownload = { blob: Blob; fileName: string };

export const downloadFiles = (files: FileForDownload[]) => {
  const a = document.createElement('a');

  function downloadNext(index: number) {
    if (index >= files.length) return;

    const file = files[index];
    const url = window.URL.createObjectURL(file.blob);

    document.body.appendChild(a);

    a.href = url;
    a.download = file.fileName;
    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 0);

    downloadNext(index + 1);
  }
  downloadNext(0);

  document.body.removeChild(a);
};
