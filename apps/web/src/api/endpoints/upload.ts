import { axiosInstance } from '../axios';

export const uploadApi = {
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post('/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },

  deleteFile: async (fileUrl: string) => {
    return axiosInstance.delete('/upload/file', {
      data: { url: fileUrl },
    });
  },
};



