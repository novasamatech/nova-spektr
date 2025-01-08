import fs from 'node:fs';

const file_path = 'package.json';

// Read the file contents as a string
const file_str = fs.readFileSync(file_path, 'utf-8');

const new_version = process.argv[2]; // Get the new version number from the command line

// Replace "version": "<version_number>" with "version": "<new_version>"
const updated_str = file_str.replace(/"version":\s*"([^"]*)"/g, (match) => {
  return match.replace(/\d+(\.\d+){2}/g, new_version);
});

// Write the updated string back to the file
fs.writeFileSync(file_path, updated_str, 'utf-8');
