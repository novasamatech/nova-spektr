type FileForDownload = { url: string; fileName: string };

export const downloadFiles = (files: FileForDownload[]) => {
  function downloadNext(index: number) {
    if (index >= files.length) {
      return;
    }
    const a = document.createElement('a');
    a.href = files[index].url;
    a.target = '_parent';
    if ('download' in a) {
      a.download = files[index].fileName;
    }

    (document.body || document.documentElement).appendChild(a);
    a.click();

    a.parentNode?.removeChild(a);
    // Download the next file with a small timeout. The timeout is necessary
    // for IE, which will otherwise only download the first file.
    setTimeout(function () {
      downloadNext(index + 1);
    }, 500);
  }
  downloadNext(0);
};
