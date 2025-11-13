"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
let UploadsController = class UploadsController {
    serveProductImage(filename, res) {
        try {
            const safe = String(filename || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
            const dir = (0, path_1.resolve)(process.cwd(), 'uploads', 'products');
            const filePath = (0, path_1.join)(dir, safe);
            if (!(0, fs_1.existsSync)(filePath)) {
                return res.status(404).send('Not Found');
            }
            const type = (() => {
                const ext = (0, path_1.extname)(filePath).toLowerCase();
                if (ext === '.jpg' || ext === '.jpeg')
                    return 'image/jpeg';
                if (ext === '.png')
                    return 'image/png';
                if (ext === '.gif')
                    return 'image/gif';
                if (ext === '.webp')
                    return 'image/webp';
                if (ext === '.svg')
                    return 'image/svg+xml';
                return 'application/octet-stream';
            })();
            try {
                res.setHeader('Content-Type', type);
            }
            catch { }
            try {
                const st = (0, fs_1.statSync)(filePath);
                if (st?.size >= 0)
                    res.setHeader('Content-Length', String(st.size));
            }
            catch { }
            const stream = (0, fs_1.createReadStream)(filePath);
            stream.on('error', () => { try {
                res.status(500).end();
            }
            catch { } });
            return stream.pipe(res);
        }
        catch (e) {
            try {
                return res.status(500).send('Internal error');
            }
            catch {
                return;
            }
        }
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Get)('products/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UploadsController.prototype, "serveProductImage", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('uploads')
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map