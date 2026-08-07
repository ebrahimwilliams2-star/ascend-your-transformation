import SwiftUI

// ComparisonModal.swift
// Fullscreen comparison modal with pinch-to-zoom, double-tap to swap, save screenshot stub

struct ComparisonModal: View {
    @Binding var isPresented: Bool
    @State private var scale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var sliderPosition: CGFloat = 0.5
    @State private var showingBeforeFirst: Bool = true

    var before: Image
    var after: Image

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            GeometryReader { geo in
                ZStack {
                    // Background image (after)
                    after
                        .resizable()
                        .scaledToFit()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .offset(offset)
                        .scaleEffect(scale)

                    // Foreground (before) masked by slider
                    before
                        .resizable()
                        .scaledToFit()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .mask(
                            Rectangle()
                                .frame(width: max(0, geo.size.width * sliderPosition))
                                .offset(x: -geo.size.width * (1 - sliderPosition) / 2)
                        )
                        .offset(offset)
                        .scaleEffect(scale)

                    // Slider handle
                    Rectangle()
                        .fill(Color.red)
                        .frame(width: 3, height: geo.size.height)
                        .position(x: geo.size.width * sliderPosition, y: geo.size.height / 2)
                        .gesture(
                            DragGesture()
                                .onChanged { value in
                                    let x = min(max(0, value.location.x), geo.size.width)
                                    sliderPosition = x / geo.size.width
                                }
                        )
                }
                .gesture(
                    MagnificationGesture()
                        .onChanged { v in
                            scale = (v).clamped(to: 1.0...4.0)
                        }
                        .onEnded { _ in
                            withAnimation(.spring()) { if scale < 1 { scale = 1 } }
                        }
                )
                .gesture(
                    DragGesture()
                        .onChanged { v in
                            offset = v.translation
                        }
                        .onEnded { _ in
                            withAnimation(.spring()) { offset = .zero }
                        }
                )
                .gesture(
                    TapGesture(count: 2).onEnded {
                        withAnimation(.easeInOut) { showingBeforeFirst.toggle() }
                        swapImages()
                    }
                )
            }

            // Top controls
            VStack {
                HStack {
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.white.opacity(0.06))
                            .cornerRadius(8)
                    }
                    Spacer()
                    Button(action: { saveScreenshot() }) {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.white.opacity(0.06))
                            .cornerRadius(8)
                    }
                }
                .padding()
                Spacer()
            }
        }
    }

    private func swapImages() {
        // Toggle state flips which image is on top; actual swap logic can be adapted to view model
    }

    private func saveScreenshot() {
        // Placeholder: implement UIView snapshot + save to photo library with permissions
        // For scaffold we'll log or call a delegate when wired to real code
        print("saveScreenshot called")
    }
}

extension Comparable {
    func clamped(to limits: ClosedRange<Self>) -> Self {
        min(max(self, limits.lowerBound), limits.upperBound)
    }
}
