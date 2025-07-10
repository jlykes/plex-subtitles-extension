import Foundation

struct PlexItem: Identifiable {
    let id: String
    let title: String
    let isContainer: Bool
    let url: String?
}

class PlexService: ObservableObject {
    let plexBaseURL = "http://192.168.4.113:32469" // <-- Change to your Plex server's IP
    @Published var controlURL: String?
    
    func fetchControlURL(completion: @escaping (String?) -> Void) {
        let url = URL(string: "\(plexBaseURL)/DeviceDescription.xml")!
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data,
                  let xml = String(data: data, encoding: .utf8) else {
                completion(nil)
                return
            }
            let regex = try! NSRegularExpression(pattern: "<serviceType>urn:schemas-upnp-org:service:ContentDirectory:1</serviceType>[\\s\\S]*?<controlURL>([^<]+)</controlURL>")
            if let match = regex.firstMatch(in: xml, range: NSRange(xml.startIndex..., in: xml)),
               let range = Range(match.range(at: 1), in: xml) {
                let controlPath = String(xml[range])
                let fullURL = controlPath.hasPrefix("http") ? controlPath : "\(self.plexBaseURL)\(controlPath)"
                DispatchQueue.main.async {
                    self.controlURL = fullURL
                    completion(fullURL)
                }
            } else {
                DispatchQueue.main.async { completion(nil) }
            }
        }.resume()
    }
    
    func browse(objectId: String = "0", completion: @escaping ([PlexItem]) -> Void) {
        guard let controlURL = controlURL ?? self.controlURL else {
            completion([])
            return
        }
        let soap = """
        <?xml version=\"1.0\" encoding=\"utf-8\"?>
        <s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">
          <s:Body>
            <u:Browse xmlns:u=\"urn:schemas-upnp-org:service:ContentDirectory:1\">
              <ObjectID>\(objectId)</ObjectID>
              <BrowseFlag>BrowseDirectChildren</BrowseFlag>
              <Filter>*</Filter>
              <StartingIndex>0</StartingIndex>
              <RequestedCount>100</RequestedCount>
              <SortCriteria></SortCriteria>
            </u:Browse>
          </s:Body>
        </s:Envelope>
        """
        var req = URLRequest(url: URL(string: controlURL)!)
        req.httpMethod = "POST"
        req.setValue("text/xml; charset=\"utf-8\"", forHTTPHeaderField: "Content-Type")
        req.setValue("\"urn:schemas-upnp-org:service:ContentDirectory:1#Browse\"", forHTTPHeaderField: "SOAPAction")
        req.httpBody = soap.data(using: .utf8)
        
        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let xml = String(data: data, encoding: .utf8) else {
                completion([])
                return
            }
            guard let resultRange = xml.range(of: "<Result>")?.upperBound,
                  let endRange = xml.range(of: "</Result>")?.lowerBound else {
                completion([])
                return
            }
            var didl = String(xml[resultRange..<endRange])
            didl = didl.replacingOccurrences(of: "&lt;", with: "<")
                         .replacingOccurrences(of: "&gt;", with: ">")
                         .replacingOccurrences(of: "&amp;", with: "&")
                         .replacingOccurrences(of: "&quot;", with: "\"")
                         .replacingOccurrences(of: "&apos;", with: "'")
            var items: [PlexItem] = []
            let containerRegex = try! NSRegularExpression(pattern: "<container([\\s\\S]*?)</container>")
            let itemRegex = try! NSRegularExpression(pattern: "<item([\\s\\S]*?)</item>")
            let titleRegex = try! NSRegularExpression(pattern: "<dc:title>([^<]+)</dc:title>")
            let idRegex = try! NSRegularExpression(pattern: "id=\"([^\"]+)\"")
            let resRegex = try! NSRegularExpression(pattern: "<res[^>]*>([^<]+)</res>")
            for match in containerRegex.matches(in: didl, range: NSRange(didl.startIndex..., in: didl)) {
                let container = (didl as NSString).substring(with: match.range)
                let id = idRegex.firstMatch(in: container, range: NSRange(container.startIndex..., in: container)).flatMap { Range($0.range(at: 1), in: container).map { String(container[$0]) } } ?? ""
                let title = titleRegex.firstMatch(in: container, range: NSRange(container.startIndex..., in: container)).flatMap { Range($0.range(at: 1), in: container).map { String(container[$0]) } } ?? "Folder"
                items.append(PlexItem(id: id, title: title, isContainer: true, url: nil))
            }
            for match in itemRegex.matches(in: didl, range: NSRange(didl.startIndex..., in: didl)) {
                let item = (didl as NSString).substring(with: match.range)
                let id = idRegex.firstMatch(in: item, range: NSRange(item.startIndex..., in: item)).flatMap { Range($0.range(at: 1), in: item).map { String(item[$0]) } } ?? ""
                let title = titleRegex.firstMatch(in: item, range: NSRange(item.startIndex..., in: item)).flatMap { Range($0.range(at: 1), in: item).map { String(item[$0]) } } ?? "Video"
                let url = resRegex.firstMatch(in: item, range: NSRange(item.startIndex..., in: item)).flatMap { Range($0.range(at: 1), in: item).map { String(item[$0]) } }
                items.append(PlexItem(id: id, title: title, isContainer: false, url: url))
            }
            DispatchQueue.main.async {
                completion(items)
            }
        }.resume()
    }
} 