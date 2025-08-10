import Foundation

actor BLEStreamBuffer {
    private var buffer = Data()
    private var continuations: [(id: UUID, continuation: CheckedContinuation<Data?, Never>)] = []

    func append(_ data: Data) {
        if !continuations.isEmpty {
            let (_, continuation) = continuations.removeFirst()
            continuation.resume(returning: data)
        } else {
            buffer.append(data)
        }
    }

    func waitForData(timeout: TimeInterval) async -> Data? {
        if !buffer.isEmpty {
            let data = buffer
            buffer.removeAll()
            return data
        }

        let id = UUID()
        return await withCheckedContinuation { (continuation: CheckedContinuation<Data?, Never>) in
            continuations.append((id, continuation))

            Task {
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                await self.timeoutContinuation(id: id)
            }
        }
    }

    private func timeoutContinuation(id: UUID) {
        if let index = continuations.firstIndex(where: { $0.id == id }) {
            let (_, continuation) = continuations.remove(at: index)
            continuation.resume(returning: nil)
        }
    }
}
