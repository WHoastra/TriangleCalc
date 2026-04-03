# TriangleCalc

A triangle solver app that calculates unknown sides, angles, area, and perimeter from any valid combination of inputs. Built with React Native and Expo.

## Features

- Solve triangles from any valid combination of sides and angles (SSS, SAS, ASA, AAS, SSA)
- Calculate all six elements: three sides (a, b, c) and three angles (A, B, C)
- Compute area and perimeter
- Interactive triangle visualization with labeled vertices, sides, and angles
- Handles ambiguous case (SSA) with two possible solutions
- Input validation with clear error messages
- Works entirely offline — no internet connection required

## Tech Stack

- **React Native** — cross-platform mobile framework
- **Expo** — development and build tooling
- **React Native SVG** — triangle visualization
- **JavaScript** — triangle solving logic (Law of Sines, Law of Cosines)

## Build Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio (for Android builds) or Xcode (for iOS builds)

### Setup

```bash
# Clone the repository
git clone https://github.com/whoastra/TriangleCalc.git
cd TriangleCalc

# Install dependencies
npm install

# Start the development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## Legal

- [Privacy Policy](https://whoastra.github.io/TriangleCalc/privacy-policy.html)
- [Terms of Service](https://whoastra.github.io/TriangleCalc/terms.html)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 WhoaStra Survey
