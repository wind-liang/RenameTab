const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// 确保 images 目录存在
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// 生成图标的尺寸
const sizes = [16, 48, 128];

// 为每个尺寸创建图标
async function generateIcons() {
  try {
    for (const size of sizes) {
      // 创建新图像
      const image = new Jimp(size, size, '#4285f4');
      
      // 添加渐变效果（通过简单的半透明叠加模拟）
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const position = x / size;
          const color = Jimp.rgbaToInt(
            66 + Math.floor(position * (52 - 66)), // R: from 4285f4 to 34a853
            133 + Math.floor(position * (168 - 133)), // G
            244 + Math.floor(position * (83 - 244)), // B
            255 // A
          );
          image.setPixelColor(color, x, y);
        }
      }

      // 保存图像
      await image.writeAsync(path.join(imagesDir, `icon${size}.png`));
    }
    console.log('图标生成完成！');
  } catch (error) {
    console.error('生成图标时出错：', error);
  }
}

generateIcons(); 