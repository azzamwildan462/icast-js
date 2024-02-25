import { Multicast } from "./multicast";

class MulticastV2 extends Multicast {
    init(name: string) {
        console.log(`Multicast ${name} initialized v2`);
    }
    send(data: any) {
        console.log(`Sending data: ${data} v2`);
    }
    receive(callback: any) {
        console.log(`Receiving data v2`);
    }
    ready_to_send() {
        console.log(`Ready to send v2`);
    }
}

export { MulticastV2 };