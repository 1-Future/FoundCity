type Hero = {
    hash64: bigint;
    points: number;
};

export default class HeroPoints extends Array<Hero> {
    constructor(length: number) {
        super(length);
        this.clear();
    }

    clear(): void {
        this.fill({ hash64: -1n, points: 0 });
    }

    addHero(hash64: bigint, points: number): void {
        if (points < 1) {
            return;
        }
        const index = this.findIndex(hero => hero && hero.hash64 === hash64);
        if (index !== -1) {
            this[index].points += points;
            return;
        }
        const emptyIndex = this.findIndex(hero => hero && hero.hash64 === -1n);
        if (emptyIndex !== -1) {
            this[emptyIndex] = { hash64, points };
        }
    }

    findHero(): bigint {
        let best: Hero = this[0];
        for (let i = 1; i < this.length; i++) {
            if (this[i].points > best.points) {
                best = this[i];
            }
        }
        return best.hash64;
    }
}
