// Minimal html2canvas mock for testing
// This is a simplified version for demonstration purposes
window.html2canvas = function(element, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Get element dimensions
      const rect = element.getBoundingClientRect();
      const scale = options.scale || 1;
      
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      
      // Fill with background color
      ctx.fillStyle = options.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some mock content
      ctx.fillStyle = '#000000';
      ctx.font = `${12 * scale}px Arial`;
      ctx.fillText('Mock Card Export', 10 * scale, 20 * scale);
      ctx.fillText('Element: ' + element.className, 10 * scale, 40 * scale);
      ctx.fillText('Size: ' + canvas.width + 'x' + canvas.height, 10 * scale, 60 * scale);
      
      // Simulate async operation
      setTimeout(() => resolve(canvas), 100);
    } catch (error) {
      reject(error);
    }
  });
};