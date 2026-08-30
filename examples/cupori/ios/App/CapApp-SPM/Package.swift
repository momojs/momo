// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.2"),
        .package(name: "CapacitorCommunitySqlite", path: "../../../../../node_modules/.bun/@capacitor-community+sqlite@8.1.0+f68449e264960a74/node_modules/@capacitor-community/sqlite"),
        .package(name: "CapacitorAppLauncher", path: "../../../../../node_modules/.bun/@capacitor+app-launcher@8.0.1+f68449e264960a74/node_modules/@capacitor/app-launcher"),
        .package(name: "CapacitorCamera", path: "../../../../../node_modules/.bun/@capacitor+camera@8.2.1+f68449e264960a74/node_modules/@capacitor/camera"),
        .package(name: "CapacitorFilesystem", path: "../../../../../node_modules/.bun/@capacitor+filesystem@8.1.2+f68449e264960a74/node_modules/@capacitor/filesystem"),
        .package(name: "CapawesomeCapacitorExif", path: "../../../../../node_modules/.bun/@capawesome+capacitor-exif@0.1.1+f68449e264960a74/node_modules/@capawesome/capacitor-exif")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunitySqlite", package: "CapacitorCommunitySqlite"),
                .product(name: "CapacitorAppLauncher", package: "CapacitorAppLauncher"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapawesomeCapacitorExif", package: "CapawesomeCapacitorExif")
            ]
        )
    ]
)
