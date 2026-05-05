<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Label;
use App\Models\Note;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Tạo hoặc lấy thông tin 2 User chính
        $users = [
            [
                'name' => 'Andy Huynh',
                'email' => 'andyhuynh6252@gmail.com',
                'password' => '11111111',
            ],
            [
                'name' => 'User',
                'email' => 'dengu2127@gmail.com',
                'password' => '11111111',
            ]
        ];

        foreach ($users as $userData) {
            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );

            // 2. Tạo 10 Nhãn (Labels) cho mỗi User
            $labels = [];
            for ($i = 1; $i <= 10; $i++) {
                $labels[] = Label::create([
                    'user_id' => $user->id,
                    'name' => fake()->unique()->word() . ' ' . $i,
                ]);
            }

            // 3. Tạo 50 Ghi chú (Notes) cho mỗi User
            for ($j = 1; $j <= 20; $j++) {
                $isPinned = fake()->boolean(20); // 20% cơ hội là được ghim

                $note = Note::create([
                    'user_id' => $user->id,
                    'title' => fake()->sentence(fake()->numberBetween(3, 6)),
                    'content' => fake()->paragraphs(3, true),
                    'is_pinned' => $isPinned,
                    'pinned_at' => $isPinned ? now() : null,
                    'password' => fake()->boolean(15) ? 'secret123' : null, // 15% ghi chú có mật khẩu
                ]);

                // 4. Gắn ngẫu nhiên 1-3 nhãn cho mỗi ghi chú
                $randomLabels = collect($labels)->random(fake()->numberBetween(1, 3))->pluck('id');
                $note->labels()->attach($randomLabels);

                // 5. Tạo ảnh giả cho ghi chú (tùy chọn)
                if (fake()->boolean(30)) {
                    $note->images()->create([
                        'image_path' => 'https://picsum.photos/seed/' . fake()->uuid . '/600/400'
                    ]);
                }
            }
        }

        // 6. Chia sẻ ngẫu nhiên một vài ghi chú giữa 2 người
        $user1 = User::where('email', 'andyhuynh6252@gmail.com')->first();
        $user2 = User::where('email', 'dengu2127@gmail.com')->first();

        if ($user1 && $user2) {
            $notesToShare = $user1->notes()->limit(5)->get();
            foreach ($notesToShare as $note) {
                $note->sharedWith()->syncWithoutDetaching([
                    $user2->id => [
                        'permission' => fake()->randomElement(['read-only', 'edit']),
                        'shared_at' => now(),
                    ]
                ]);
            }
        }

        $this->command->info('Đã tạo xong 2 users, mỗi user có 10 labels và 50 notes!');
    }
}