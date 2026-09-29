-- Test seed for the operations clone (re-runnable: wipes LUK54 test rows first)
delete from daily_production where project_id = 'LUK54';
delete from flock_events where project_id = 'LUK54';
delete from feed_purchases where project_id = 'LUK54';
delete from feed_inventory where project_id = 'LUK54';
delete from weekly_feed_mix where project_id = 'LUK54';
delete from sales where project_id = 'LUK54';
delete from health_events where project_id = 'LUK54';
delete from inventory where project_id = 'LUK54';
delete from staff_notes where project_id = 'LUK54';
delete from workers where project_id = 'LUK54';

-- sections with birds
update flock_sections set bird_count = 800, label = 'Section A — Young' where project_id = 'LUK54' and section_id = 'A';
update flock_sections set bird_count = 900, label = 'Section B — Medium' where project_id = 'LUK54' and section_id = 'B';
update flock_sections set bird_count = 800, label = 'Section C — Grown' where project_id = 'LUK54' and section_id = 'C';
update flock_sections set bird_count = 0, label = 'Others' where project_id = 'LUK54' and section_id = 'Others';

-- 5 days of production (2500 birds, ~88% lay rate, small mortality)
insert into daily_production (project_id, date, section, opening_birds, mortality, closing_birds, eggs_trays, eggs_collected, breakages, eggs_lost, feed_issued_kg, notes) values
 ('LUK54', current_date - 4, 'Combined', 2500, 2, 2498, 73, 2190, 5, 0, 290, 'Normal day'),
 ('LUK54', current_date - 3, 'Combined', 2498, 1, 2497, 74, 2220, 3, 0, 292, 'Good lay rate'),
 ('LUK54', current_date - 2, 'Combined', 2497, 4, 2493, 71, 2130, 8, 1, 288, 'Slight drop, watching'),
 ('LUK54', current_date - 1, 'Combined', 2493, 0, 2493, 75, 2250, 2, 0, 295, 'Best day this week'),
 ('LUK54', current_date, 'Combined', 2493, 1, 2492, 74, 2220, 4, 0, 293, 'Test log from seed');

-- flock events
insert into flock_events (project_id, date, event_type, quantity, notes) values
 ('LUK54', '2026-06-01', 'Stocking', 2500, 'Day-old chicks received'),
 ('LUK54', current_date - 10, 'Culling', 7, 'Weak birds removed');

-- feed purchases + stock
insert into feed_purchases (project_id, date, product, qty_kg, unit_cost, total_cost, supplier) values
 ('LUK54', current_date - 6, 'Brand', 500, 1800, 900000, 'Uganda Feeds Ltd'),
 ('LUK54', current_date - 6, 'Concentrate', 200, 4500, 900000, 'Hendrix Agent'),
 ('LUK54', current_date - 2, 'Maize', 300, 1500, 450000, 'Local mill');
insert into feed_inventory (project_id, product, closing_stock, purchases, consumption, unit_cost) values
 ('LUK54', 'Brand', 420, 500, 80, 1800),
 ('LUK54', 'Concentrate', 160, 200, 40, 4500),
 ('LUK54', 'Maize', 260, 300, 40, 1500);

-- weekly mix
insert into weekly_feed_mix (project_id, week_start, week_end, brand_kg, concentrate_kg, lime_powder_kg, limestone_kg, soya_kg, sunflower_kg, broken_kg, maize_kg, others_kg, total_kg, notes) values
 ('LUK54', current_date - 7, current_date - 1, 1400, 350, 70, 60, 280, 140, 90, 700, 20, 3110, 'Test formulation');

-- sales
insert into sales (project_id, date, customer, quantity_trays, quantity_eggs, unit_price, total_revenue, sale_category, egg_type, payment_status, payment_ref, breakage_trays_sold, damaged_trays_sold, lost_trays, notes) values
 ('LUK54', current_date - 1, 'Mama Naki Shop', 50, 1500, 11000, 550000, 'Eggs', 'Normal', 'Cash', '', 1, 0, 0, 'Paid in full'),
 ('LUK54', current_date - 1, 'Kampala Grocers', 30, 900, 9000, 270000, 'Eggs', 'Starter', 'Debt', 'INV-001', 0, 1, 0, 'Pay Friday'),
 ('LUK54', current_date, 'Garden Project', 5, 150, 5000, 25000, 'Litter', '', 'Cash', '', 0, 0, 0, 'Manure sale');

-- health
insert into health_events (project_id, date, type, product, notes) values
 ('LUK54', current_date - 5, 'Medication', 'GLUCOVIT', 'Vitamins in water, 3 days'),
 ('LUK54', current_date - 2, 'Vaccination', 'NEWCASTLE LASOTA', 'Monthly booster, all sections');
update vaccination_schedule set status = 'Completed' where project_id = 'LUK54' and week = 4 and vaccine = 'NEWCASTLE LASOTA';

-- inventory / notes / workers
insert into inventory (project_id, name, quantity, unit) values
 ('LUK54', 'Egg trays (empty)', 400, 'pcs'),
 ('LUK54', 'Disinfectant', 5, 'litres');
insert into staff_notes (project_id, date, content, category) values
 ('LUK54', current_date, 'Clean drinkers in Section B tomorrow morning.', 'General'),
 ('LUK54', current_date, 'Watcher reports fox tracks near fence — check at night.', 'Staff');
insert into workers (project_id, name, payroll, bonus, advance, notes) values
 ('LUK54', 'Okello James', 300000, 20000, 50000, 'Full time'),
 ('LUK54', 'Amina Yusuf', 250000, 0, 0, 'Part time, mornings');
