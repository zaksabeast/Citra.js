# Citra.js

Node.js bindings for Citra

## Usage

```javascript
const {
  createConnection,
  readMemory,
  writeMemory,
} = require('citra.js');

// Create connection
const citra = createConnection();

// Read from memory
readMemory(citra, 0xAABBCCDD, 4)
  .then(data => console.log(data.toString(16)));

// Write data
writeMemory(citra, 0xAABBCCDD, buffer)
  .then(() => console.log('success'));
```

## Credits

Thanks to @EverOddish for adding scripting support to Citra, as well as their original Python bindings