import SwiftUI
import AVKit
import AVFoundation

struct PlayerItem: Identifiable, Equatable {
    let id = UUID()
    let url: URL
}

struct PlexBrowserView: View {
    @StateObject private var plex = PlexService()
    @State private var items: [PlexItem] = []
    @State private var path: [PlexItem] = []
    @State private var loading = false
    @State private var error: String?
    @State private var playerItem: PlayerItem? = nil
    @State private var playbackError: String?

    var body: some View {
        NavigationView {
            VStack {
                Button("Test Public Video") {
                    let testUrl = URL(string: "https://www.w3schools.com/html/mov_bbb.mp4")!
                    playerItem = PlayerItem(url: testUrl)
                    playbackError = nil
                }
                .padding()
                if loading {
                    ProgressView("Loading...")
                } else if let error = error {
                    Text("Error: \(error)").foregroundColor(.red)
                } else {
                    List(items) { item in
                        HStack {
                            Image(systemName: item.isContainer ? "folder" : "film")
                            Text(item.title)
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            if item.isContainer {
                                browse(objectId: item.id)
                                path.append(item)
                            } else if let urlStr = item.url, let url = URL(string: urlStr) {
                                print("Attempting to play: \(urlStr)")
                                playerItem = PlayerItem(url: url)
                                playbackError = nil
                            }
                        }
                    }
                }
                if !path.isEmpty {
                    Button("⬅️ Back") {
                        path.removeLast()
                        let parentId = path.last?.id ?? "0"
                        browse(objectId: parentId)
                    }
                    .padding()
                }
                if let playbackError = playbackError {
                    Text("Playback error: \(playbackError)")
                        .foregroundColor(.red)
                        .padding()
                }
            }
            .navigationTitle(path.last?.title ?? "Plex Library")
            .onAppear {
                // Set up audio session for playback
                do {
                    try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
                    try AVAudioSession.sharedInstance().setActive(true)
                } catch {
                    print("Failed to set audio session: \(error)")
                }
                plex.fetchControlURL { _ in
                    browse(objectId: "0")
                }
            }
            .sheet(item: $playerItem, onDismiss: {
                playerItem = nil
            }) { item in
                VideoPlayerOverlayTestView(url: item.url)
            }
        }
    }

    private func browse(objectId: String) {
        loading = true
        error = nil
        plex.browse(objectId: objectId) { newItems in
            loading = false
            items = newItems
            if newItems.isEmpty {
                error = "No items found."
            }
        }
    }
}

struct VideoPlayerOverlayTestView: View {
    let url: URL
    @State private var showSubtitle = false

    var body: some View {
        ZStack(alignment: .bottom) {
            VideoPlayer(player: AVPlayer(url: url))
                .aspectRatio(16/9, contentMode: .fit)
                .background(Color.black)
            if showSubtitle {
                VStack {
                    Spacer()
                    Text("This is a simulated subtitle overlay!")
                        .font(.title2)
                        .foregroundColor(.white)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(8)
                        .padding(.bottom, 32)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
            VStack {
                HStack {
                    Spacer()
                    Button(showSubtitle ? "Hide Subtitle Overlay" : "Show Subtitle Overlay") {
                        withAnimation { showSubtitle.toggle() }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.8))
                    .cornerRadius(8)
                    .padding([.top, .trailing], 16)
                }
                Spacer()
            }
        }
    }
} 