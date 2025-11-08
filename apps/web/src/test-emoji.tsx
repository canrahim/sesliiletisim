// Test file to ensure emoji-mart is included in build
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useDropzone } from 'react-dropzone';

console.log('Emoji data loaded:', data);
console.log('Picker loaded:', Picker);
console.log('Dropzone loaded:', useDropzone);

export const TestEmoji = () => {
  return <div>Test</div>;
};





