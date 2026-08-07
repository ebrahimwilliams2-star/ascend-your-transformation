// TransformScreen.swift
// SwiftUI scaffold for Transform feature (iOS)

import SwiftUI

struct TransformScreen: View {
    var body: some View {
        ZStack {
            Color(.black)
                .edgesIgnoringSafeArea(.all)
            ScrollView {
                VStack(spacing: 24) {
                    TransformationHero()
                    TimelineSection()
                }
                .padding()
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct TransformationHero: View {
    @State private var sliderPosition: CGFloat = 0.5
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack {
                BeforeAfterView(before: Image("mock_before"), after: Image("mock_after"), position: $sliderPosition)
                    .frame(height: 300)
                    .cornerRadius(12)
                    .shadow(radius: 8)
            }
            HeroStatsRow()
        }
    }
}

struct BeforeAfterView: View {
    let before: Image
    let after: Image
    @Binding var position: CGFloat

    var body: some View {
        GeometryReader { geo in
            ZStack {
                after
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                before
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                    .mask(
                        Rectangle()
                            .frame(width: max(0, geo.size.width * position))
                    )
                // Divider
                Rectangle()
                    .fill(Color.red)
                    .frame(width: 2, height: geo.size.height)
                    .offset(x: geo.size.width * position - 1)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                let x = min(max(0, value.location.x), geo.size.width)
                                position = x / geo.size.width
                            }
                    )
            }
        }
    }
}

struct HeroStatsRow: View {
    var body: some View {
        HStack(spacing: 16) {
            StatPill(title: "Days", value: "124")
            StatPill(title: "Start", value: "82kg")
            StatPill(title: "Current", value: "75kg")
            StatPill(title: "XP", value: "7.4k")
        }
    }
}

struct StatPill: View {
    let title: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
            Text(value)
                .font(.headline)
                .foregroundColor(.white)
        }
        .padding(8)
        .background(Color(.systemGray6).opacity(0.06))
        .cornerRadius(8)
    }
}

struct TimelineSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Progress Timeline")
                .font(.title2)
                .bold()
                .foregroundColor(.white)
            VStack(spacing: 12) {
                TimelineCard()
                TimelineCard()
                TimelineCard()
            }
        }
    }
}

struct TimelineCard: View {
    var body: some View {
        HStack(spacing: 12) {
            Image("mock_thumb")
                .resizable()
                .frame(width: 80, height: 80)
                .cornerRadius(8)
            VStack(alignment: .leading) {
                Text("Week 4")
                    .foregroundColor(.white)
                    .bold()
                Text("79kg — Feeling stronger.")
                    .foregroundColor(.gray)
                    .font(.subheadline)
            }
            Spacer()
        }
        .padding()
        .background(Color(.systemGray6).opacity(0.04))
        .cornerRadius(12)
    }
}

struct TransformScreen_Previews: PreviewProvider {
    static var previews: some View {
        TransformScreen()
    }
}
