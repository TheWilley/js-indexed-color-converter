import { JSIndexedColorConverter } from '../src/index'

describe('JSIndexedColorConverter', () => {
  let converter: JSIndexedColorConverter

  beforeEach(() => {
    converter = new JSIndexedColorConverter()

    // Mock ImageData class
    global.ImageData = class ImageData {
      data: Uint8ClampedArray
      width: number
      height: number
      colorSpace: PredefinedColorSpace

      // First constructor: width and height
      constructor(width: number, height: number)

      // Second constructor: Uint8ClampedArray and width, height
      constructor(data: Uint8ClampedArray, width: number, height?: number)

      // Implement the constructor logic
      constructor(
        arg1: number | Uint8ClampedArray,
        arg2: number,
        arg3?: number
      ) {
        if (typeof arg1 === 'number') {
          // If the first argument is a number, it's the width (first constructor)
          this.width = arg1
          this.height = arg2
          this.data = new Uint8ClampedArray(this.width * this.height * 4) // Initialize pixel data
        } else {
          // If the first argument is a Uint8ClampedArray, use the second constructor signature
          this.data = arg1
          this.width = arg2
          this.height = arg3 ?? arg1.length / 4 / arg2 // Calculate height if not provided
        }
        this.colorSpace = 'srgb'
      }
    }
  })

  test('convertToIndexedColor should convert image to indexed color mode', () => {
    const imageData = new ImageData(2, 2)
    const palette = [
      [255, 0, 0], // Red
      [0, 255, 0], // Green
      [0, 0, 255], // Blue
    ]

    const result = converter.convertToIndexedColor(imageData, palette)

    expect(result).toBeInstanceOf(ImageData)
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
  })
})
