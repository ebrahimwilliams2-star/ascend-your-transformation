// TransformScreen.swift
// SwiftUI scaffold for Transform feature (iOS) - enhanced interactions

import SwiftUI

struct TransformScreen: View {
    @StateObject private var vm = TransformViewModel()

    var body: some View {
        ZStack {
            Color(hex: "000000")
                .edgesIgnoringSafeArea(.all)
            ScrollView {
                VStack(spacing: 24) {
                    TransformationHero(viewModel: vm)
                        .padding(.top, 24)
                    TimelineSection()
                }
                .padding([.leading, .trailing], 16)
                .padding(.bottom, 40)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            vm.animateToTargets()
        }
    }
}

struct TransformationHero: View {
    @ObservedObject var viewModel: TransformViewModel

    @State private var sliderPosition: CGFloat = 0.5
    @State private var scale: CGFloat = 1.0
    @State private var isShowingBeforeFirst: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack {
                GeometryReader { geo in
                    ZStack {
                        Image(isShowingBeforeFirst ? "mock_after" : "mock_before")
                            .resizable()
                            .scaledToFill()
                            .frame(width: geo.size.width, height: geo.size.height)
                            .clipped()
                            .scaleEffect(scale)
                            .animation(.spring(), value: scale)

                        Image(isShowingBeforeFirst ? "mock_before" : "mock_after")
                            .resizable()
                            .scaledToFill()
                            .frame(width: geo.size.width, height: geo.size.height)
                            .clipped()
                            .scaleEffect(scale)
                            .mask(
                                Rectangle()
                                    .frame(width: max(0, geo.size.width * sliderPosition))
                            )

                        // Divider handle
                        Rectangle()
                            .fill(Color.red)
                            .frame(width: 3, height: geo.size.height)
                            .offset(x: geo.size.width * sliderPosition - 1.5)
                            .gesture(
                                DragGesture(minimumDistance: 0)
                                    .onChanged { value in
                                        let x = min(max(0, value.location.x), geo.size.width)
                                        sliderPosition = x / geo.size.width
                                    }
                            )

                        // Gestures: double-tap to swap, pinch to zoom
                    }
                    .gesture(
                        TapGesture(count: 2)
                            .onEnded {
                                withAnimation(.easeInOut(duration: 0.25)) {
                                    isShowingBeforeFirst.toggle()
                                }
                            }
                    )
                    .gesture(
                        MagnificationGesture()
                            .onChanged { v in
                                scale = max(1.0, min(3.0, v))
                            }
                            .onEnded { _ in
                                withAnimation(.spring()) { scale = 1.0 }
                            }
                    )
                }
            }
            .frame(height: 320)
            .cornerRadius(12)
            .shadow(radius: 10)

            HeroStatsRow(viewModel: viewModel)
        }
    }
}

struct HeroStatsRow: View {
    @ObservedObject var viewModel: TransformViewModel

    var body: some View {
        HStack(spacing: 12) {
            CountupStat(title: "Days", value: viewModel.days)
            StatPill(title: "Start", value: String(format: "%.0fkg", viewModel.startWeight))
            CountupStat(title: "Current", value: Int(viewModel.currentWeight))
            CountupStat(title: "XP", value: viewModel.xp)
        }
    }
}

struct CountupStat: View {
    let title: String
    let value: Int
    @State private var displayed: Int = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
            Text("\(displayed)")
                .font(.headline)
                .foregroundColor(.white)
                .bold()
                .onChange(of: value) { newValue in
                    animate(to: newValue)
                }
                .onAppear { animate(to: value) }
        }
        .padding(8)
        .background(Color.white.opacity(0.04))
        .cornerRadius(8)
    }

    private func animate(to newValue: Int) {
        let diff = newValue - displayed
        guard diff != 0 else { return }
        let steps = 30
        let stepValue = max(1, Int(Double(diff) / Double(steps)))
        var current = displayed
        Timer.scheduledTimer(withTimeInterval: 0.012, repeats: true) { timer in
            if current < newValue {
                current += stepValue
                if current >= newValue {
                    current = newValue
                    timer.invalidate()
                }
                DispatchQueue.main.async { displayed = current }
            } else {
                timer.invalidate()
            }
        }
    }
}

// Helpers
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        let r = Double((rgb >> 16) & 0xFF) / 255.0
        let g = Double((rgb >> 8) & 0xFF) / 255.0
        let b = Double(rgb & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}

// Previews
struct TransformScreen_Previews: PreviewProvider {
    static var previews: some View {
        TransformScreen()
            .previewDevice("iPhone 13 Pro")
    }
}
