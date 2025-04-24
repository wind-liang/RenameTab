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
      // 创建新图像，使用透明背景
      const image = new Jimp(size, size, 0x00000000);
      
      // 定义颜色
      const primaryColor = 0x2196F3FF; // Material Blue
      
      // 计算圆形背景的参数
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2;
      
      // 绘制圆形背景
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const distanceFromCenter = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
          );
          
          if (distanceFromCenter <= radius) {
            image.setPixelColor(primaryColor, x, y);
          }
        }
      }

      // 绘制字母"T"（稍微调大一些）
      const tWidth = Math.floor(size * 0.6);  // 增加宽度
      const tHeight = Math.floor(size * 0.6);  // 增加高度
      const tThickness = Math.max(2, Math.floor(size * 0.15));  // 增加粗细
      const tX = Math.floor((size - tWidth) / 2);
      const tY = Math.floor((size - tHeight) / 2) - Math.floor(size * 0.05);  // 稍微上移

      // 绘制T的横线
      for (let x = tX; x < tX + tWidth; x++) {
        for (let y = tY; y < tY + tThickness; y++) {
          if (isInsideCircle(x, y, centerX, centerY, radius)) {
            image.setPixelColor(0xFFFFFFFF, x, y);
          }
        }
      }

      // 绘制T的竖线
      const tVerticalX = tX + Math.floor(tWidth / 2) - Math.floor(tThickness / 2);
      for (let x = tVerticalX; x < tVerticalX + tThickness; x++) {
        for (let y = tY; y < tY + tHeight; y++) {
          if (isInsideCircle(x, y, centerX, centerY, radius)) {
            image.setPixelColor(0xFFFFFFFF, x, y);
          }
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

// 辅助函数：检查点是否在圆内
function isInsideCircle(x, y, centerX, centerY, radius) {
  return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) <= radius;
}

generateIcons(); 