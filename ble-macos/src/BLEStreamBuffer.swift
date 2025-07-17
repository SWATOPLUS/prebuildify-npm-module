import Foundation

actor BLEStreamBuffer {
    private var buffer = Data()
    private var continuations: [CheckedContinuation<Data?, Never>] = []

    func append(_ data: Data) {
        if !continuations.isEmpty {
            let continuation = continuations.removeFirst()
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

        return await withCheckedContinuation { (continuation: CheckedContinuation<Data?, Never>) in
            continuations.append(continuation)

            // Start a timeout task
            Task {
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))

                // Remove and resume if it hasn't been fulfilled
                if let i = continuations.firstIndex(where: { $0 as AnyObject === continuation as AnyObject }) {
                    let c = continuations.remove(at: i)
                    c.resume(returning: nil)
                }
            }
        }
    }
}
