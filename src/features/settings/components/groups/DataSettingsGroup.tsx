import { open, ask, message, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight } from "lucide-react";
import { relaunch } from "@tauri-apps/plugin-process";

interface DataSettingsGroupProps {
    t: (key: string) => string;
    collapsed: boolean;
    onToggle: () => void;
    dataPath: string;
}

const DataSettingsGroup = ({ t, collapsed, onToggle, dataPath }: DataSettingsGroupProps) => (
    <div className={`settings-group ${collapsed ? 'collapsed' : ''}`}>
        <div className="group-header" onClick={onToggle}>
            <h3 style={{ margin: 0 }}>{t('data_management')}</h3>
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </div>
        {!collapsed && (
            <div className="group-content">
                <div className="setting-item column no-border">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="item-label" style={{ textTransform: 'uppercase', fontSize: '11px', opacity: 0.8 }}>{t('data_path')}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn-icon"
                                onClick={() => {
                                    open({
                                        directory: true,
                                        multiple: false,
                                        title: t('change_data_path')
                                    }).then(async (selected) => {
                                        if (selected) {
                                            const newPath = selected as string;
                                            const confirm = await ask(
                                                t('data_move_confirm').replace('{path}', newPath),
                                                { title: t('change_data_path'), kind: 'warning', okLabel: t('confirm'), cancelLabel: t('cancel') }
                                            );

                                            if (confirm) {
                                                try {
                                                    // Logic Update:
                                                    // We DO NOT copy the file here because the DB is locked/in-use.
                                                    // Instead, we just set the path and restart.
                                                    // The backend 'main.rs' startup logic will handle the migration (copying)
                                                    // if it detects a custom path with no DB using the default DB as source.

                                                    await invoke("set_data_path", { newPath });

                                                    await message(
                                                        t('data_move_success'),
                                                        { title: t('notice'), kind: 'info' }
                                                    );

                                                    await invoke("relaunch");
                                                } catch (e: unknown) {
                                                    console.error(e);
                                                    const errorMsg = e instanceof Error ? e.message : String(e);
                                                    await message(
                                                        t('data_move_failed').replace('{e}', errorMsg),
                                                        { title: t('error'), kind: 'error' }
                                                    );
                                                }
                                            }
                                        }
                                    });
                                }}
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', height: '24px' }}
                            >
                                {t('change_app')}
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => invoke("open_data_folder").catch(console.error)}
                                title={t('open_folder') || "Open"}
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', height: '24px' }}
                            >
                                {t('open_folder')}
                            </button>
                        </div>
                    </div>
                    <div className="data-panel" style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {dataPath}
                    </div>
                </div>
                <div className="setting-item column no-border">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="item-label" style={{ textTransform: 'uppercase', fontSize: '11px', opacity: 0.8 }}>
                            {t('settings_backup') || '个人设置备份'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn-icon"
                                onClick={async () => {
                                    try {
                                        const target = await save({
                                            title: t('export_settings_backup') || '导出个人设置',
                                            defaultPath: 'sipsip-settings-backup.json',
                                            filters: [
                                                {
                                                    name: 'JSON',
                                                    extensions: ['json']
                                                }
                                            ]
                                        });
                                        if (!target || typeof target !== 'string') return;
                                        await invoke('export_settings_backup', { targetPath: target });
                                        await message(
                                            t('settings_backup_export_success') || '个人设置已导出。',
                                            { title: t('notice'), kind: 'info' }
                                        );
                                    } catch (e: unknown) {
                                        console.error(e);
                                        const errorMsg = e instanceof Error ? e.message : String(e);
                                        await message(
                                            (t('settings_backup_export_failed') || '导出个人设置失败: {e}').replace('{e}', errorMsg),
                                            { title: t('error'), kind: 'error' }
                                        );
                                    }
                                }}
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', height: '24px' }}
                            >
                                {t('export_settings_backup') || '导出'}
                            </button>
                            <button
                                className="btn-icon"
                                onClick={async () => {
                                    try {
                                        const selected = await open({
                                            multiple: false,
                                            title: t('import_settings_backup') || '导入个人设置',
                                            filters: [
                                                {
                                                    name: 'JSON',
                                                    extensions: ['json']
                                                }
                                            ]
                                        });
                                        if (!selected || typeof selected !== 'string') return;

                                        const confirmed = await ask(
                                            t('settings_backup_import_confirm') || '导入后将恢复个人设置并重启应用，是否继续？',
                                            { title: t('import_settings_backup') || '导入个人设置', kind: 'warning', okLabel: t('confirm'), cancelLabel: t('cancel') }
                                        );
                                        if (!confirmed) return;

                                        await invoke('import_settings_backup', { sourcePath: selected });
                                        await message(
                                            t('settings_backup_import_success') || '个人设置已恢复，应用即将重启。',
                                            { title: t('notice'), kind: 'info' }
                                        );
                                        await relaunch();
                                    } catch (e: unknown) {
                                        console.error(e);
                                        const errorMsg = e instanceof Error ? e.message : String(e);
                                        await message(
                                            (t('settings_backup_import_failed') || '导入个人设置失败: {e}').replace('{e}', errorMsg),
                                            { title: t('error'), kind: 'error' }
                                        );
                                    }
                                }}
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '10px', textTransform: 'uppercase', height: '24px' }}
                            >
                                {t('import_settings_backup') || '导入'}
                            </button>
                        </div>
                    </div>
                    <div className="data-panel" style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {t('settings_backup_hint') || '导出当前个人设置；如存在自定义背景，会连同背景图片一起备份。导入后自动重启应用。'}
                    </div>
                </div>
            </div>
        )}
    </div>
);

export default DataSettingsGroup;
