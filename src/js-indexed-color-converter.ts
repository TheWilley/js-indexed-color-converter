type Pixel = { rgb: number[]; lab: number[] }

export class JSIndexedColorConverter {
  /**
   * Convert an image resource to indexed color mode.
   * The original image resource will not be changed, a new image resource will be created.
   *
   * @param im The image resource
   * @param palette The color palette
   * @param dither The Floyd–Steinberg dither amount, value is between 0 and 1 and default value is 0.75
   * @return The image resource in indexed colr mode.
   */
  public convertToIndexedColor(
    im: ImageData,
    palette: number[][],
    dither = 0.75
  ): ImageData {
    const newPalette: Pixel[] = []
    palette.forEach((paletteColor) => {
      newPalette.push({
        rgb: paletteColor,
        lab: this.RGBtoLab(paletteColor),
      })
    })

    const width = im.width
    const height = im.height

    const newImage = this.floydSteinbergDither(
      im,
      width,
      height,
      newPalette,
      dither
    )

    return newImage
  }

  /**
   * Apply Floyd–Steinberg dithering algorithm to an image.
   *
   * http://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering
   *
   * @param im The image resource
   * @param width The width of an image
   * @param height The height of an image
   * @param palette The color palette
   * @param amount The dither amount(value is between 0 and 1)
   * @return The pixels after applying Floyd–Steinberg dithering
   */
  private floydSteinbergDither(
    im: ImageData,
    width: number,
    height: number,
    palette: Pixel[],
    amount: number
  ): ImageData {
    const newImage = new ImageData(width, height)
    let currentRowColorStorage: number[][] = []
    let nextRowColorStorage: number[][] = []
    let color
    let closestColor
    let quantError

    for (let i = 0; i < height; i++) {
      if (i === 0) {
        currentRowColorStorage = []
      } else {
        currentRowColorStorage = nextRowColorStorage
      }

      nextRowColorStorage = []

      for (let j = 0; j < width; j++) {
        if (i === 0 && j === 0) {
          color = this.getRGBColorAt(im, j, i)
        } else {
          color = currentRowColorStorage[j]
        }
        closestColor = this.getClosestColor(
          { rgb: color, lab: [] },
          palette,
          'rgb'
        )
        closestColor = closestColor['rgb']

        if (j < width - 1) {
          if (i === 0) {
            currentRowColorStorage[j + 1] = this.getRGBColorAt(im, j + 1, i)
          }
        }
        if (i < height - 1) {
          if (j === 0) {
            nextRowColorStorage[j] = this.getRGBColorAt(im, j, i + 1)
          }
          if (j < width - 1) {
            nextRowColorStorage[j + 1] = this.getRGBColorAt(im, j + 1, i + 1)
          }
        }

        for (const key in closestColor) {
          quantError = color[key] - closestColor[key]
          if (j < width - 1) {
            currentRowColorStorage[j + 1][key] +=
              ((quantError * 7) / 16) * amount
          }
          if (i < height - 1) {
            if (j > 0) {
              nextRowColorStorage[j - 1][key] +=
                ((quantError * 3) / 16) * amount
            }
            nextRowColorStorage[j][key] += ((quantError * 5) / 16) * amount
            if (j < width - 1) {
              nextRowColorStorage[j + 1][key] +=
                ((quantError * 1) / 16) * amount
            }
          }
        }

        this.imagesetpixel(newImage, j, i, closestColor)
      }
    }

    return newImage
  }

  /**
   * Get the closest available color from a color palette.
   *
   * @param pixel The pixel that contains the color to be calculated
   * @param palette The palette that contains all the available colors
   * @param mode The calculation mode, the value is 'rgb' or 'lab', 'rgb' is default value.
   * @return The closest color from the palette
   */
  private getClosestColor(pixel: Pixel, palette: Pixel[], mode = 'rgb'): Pixel {
    type PixelKey = keyof typeof pixel

    if (palette.length === 0) {
      throw new Error('Palette cannot be empty')
    }

    // Initialize closestColor to the first color in the palette
    let closestColor: Pixel = palette[0]
    let closestDistance = this.calculateEuclideanDistanceSquare(
      pixel[mode as PixelKey],
      closestColor[mode as PixelKey]
    )

    palette.forEach((color) => {
      const distance = this.calculateEuclideanDistanceSquare(
        pixel[mode as PixelKey],
        color[mode as PixelKey]
      )
      if (distance < closestDistance) {
        closestColor = color
        closestDistance = distance
      } else if (distance === closestDistance) {
        // nothing to do if distance is equal
      }
    })

    return closestColor
  }

  /**
   * Calculate the square of the euclidean distance of two colors.
   *
   * @param p The first color
   * @param q The second color
   * @return The square of the euclidean distance of first color and second color
   */
  private calculateEuclideanDistanceSquare(p: number[], q: number[]): number {
    return (
      Math.pow(q[0] - p[0], 2) +
      Math.pow(q[1] - p[1], 2) +
      Math.pow(q[2] - p[2], 2)
    )
  }

  /**
   * Calculate the RGB color of a pixel.
   *
   * @param im The image resource
   * @param x The x-coordinate of the pixel
   * @param y The y-coordinate of the pixel
   * @return An array with red, green and blue values of the pixel
   */
  private getRGBColorAt(im: ImageData, x: number, y: number): number[] {
    const index = (y * im.width + x) * 4 // Calculate the index for the pixel
    const r = im.data[index] // Red component
    const g = im.data[index + 1] // Green component
    const b = im.data[index + 2] // Blue component
    return [r, g, b] // Return RGB as an array
  }

  /**
   * Convert an RGB color to a Lab color(CIE Lab).
   *
   * @param rgb The RGB color
   * @return The Lab color
   */
  private RGBtoLab(rgb: number[]): number[] {
    return this.XYZtoCIELab(this.RGBtoXYZ(rgb))
  }

  /**
   * Convert an RGB color to an XYZ space color.
   *
   * observer = 2°, illuminant = D65
   * http://easyrgb.com/index.php?X=MATH&H=02#text2
   *
   * @param rgb The RGB color
   * @return The XYZ space color
   */
  private RGBtoXYZ(rgb: number[]): number[] {
    let r = rgb[0] / 255
    let g = rgb[1] / 255
    let b = rgb[2] / 255

    if (r > 0.04045) {
      r = Math.pow((r + 0.055) / 1.055, 2.4)
    } else {
      r = r / 12.92
    }

    if (g > 0.04045) {
      g = Math.pow((g + 0.055) / 1.055, 2.4)
    } else {
      g = g / 12.92
    }

    if (b > 0.04045) {
      b = Math.pow((b + 0.055) / 1.055, 2.4)
    } else {
      b = b / 12.92
    }

    r *= 100
    g *= 100
    b *= 100

    return [
      r * 0.4124 + g * 0.3576 + b * 0.1805,
      r * 0.2126 + g * 0.7152 + b * 0.0722,
      r * 0.0193 + g * 0.1192 + b * 0.9505,
    ]
  }

  /**
   * Convert an XYZ space color to a CIE Lab color.
   *
   * observer = 2°, illuminant = D65.
   * http://www.easyrgb.com/index.php?X=MATH&H=07#text7
   *
   * @param xyz The XYZ space color
   * @return The Lab color
   */
  private XYZtoCIELab(xyz: number[]): number[] {
    const refX = 95.047
    const refY = 100
    const refZ = 108.883

    let x = xyz[0] / refX
    let y = xyz[1] / refY
    let z = xyz[2] / refZ

    if (x > 0.008856) {
      x = Math.pow(x, 1 / 3)
    } else {
      x = 7.787 * x + 16 / 116
    }

    if (y > 0.008856) {
      y = Math.pow(y, 1 / 3)
    } else {
      y = 7.787 * y + 16 / 116
    }

    if (z > 0.008856) {
      z = Math.pow(z, 1 / 3)
    } else {
      z = 7.787 * z + 16 / 116
    }

    return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
  }

  /**
   * Sets the color of a pixel in the given ImageData object.
   *
   * @param imageData The ImageData object to modify.
   * @param j The x-coordinate of the pixel.
   * @param i The y-coordinate of the pixel.
   * @param rgb An array containing the RGB values [R, G, B].
   */
  private imagesetpixel(
    imageData: ImageData,
    j: number,
    i: number,
    rgb: number[]
  ): void {
    // Check if the provided coordinates are within bounds
    if (j < 0 || j >= imageData.width || i < 0 || i >= imageData.height) {
      console.error('Coordinates are out of bounds.')
      return
    }

    // Calculate the index in the ImageData.data array
    const index = (i * imageData.width + j) * 4 // 4 for RGBA

    // Assign RGB values and set alpha (full opacity)
    imageData.data[index] = rgb[0] // Red
    imageData.data[index + 1] = rgb[1] // Green
    imageData.data[index + 2] = rgb[2] // Blue
    imageData.data[index + 3] = 255 // Alpha (full opacity)
  }
}
